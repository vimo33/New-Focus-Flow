import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { YouTubePlaylist, YouTubeVideo } from '../models/types';
import { getVaultPath, readJsonFile, writeJsonFile, ensureDir } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { cachedInference } from './cached-inference.service';
import { mem0Service } from './mem0.service';

const execFileAsync = promisify(execFile);

const PLAYLISTS_PATH = '10_knowledge/youtube/playlists.json';
const VIDEOS_DIR = '10_knowledge/youtube/videos';
const TRANSCRIPTS_DIR = '10_knowledge/youtube/transcripts';

const SUMMARIZATION_SYSTEM_PROMPT = `You are a concise summarizer. Given a YouTube video transcript, produce a clear, information-dense summary that captures the key points, insights, and actionable takeaways. Keep it under 300 words. Focus on what someone would need to know without watching the video.`;

class YouTubeIndexerService {

  private async ensureStorage(): Promise<void> {
    await ensureDir(getVaultPath('10_knowledge/youtube'));
    await ensureDir(getVaultPath(VIDEOS_DIR));
    await ensureDir(getVaultPath(TRANSCRIPTS_DIR));
  }

  private async loadPlaylists(): Promise<YouTubePlaylist[]> {
    return (await readJsonFile<YouTubePlaylist[]>(getVaultPath(PLAYLISTS_PATH))) || [];
  }

  private async savePlaylists(playlists: YouTubePlaylist[]): Promise<void> {
    await writeJsonFile(getVaultPath(PLAYLISTS_PATH), playlists);
  }

  private async loadVideos(playlistId: string): Promise<YouTubeVideo[]> {
    return (await readJsonFile<YouTubeVideo[]>(getVaultPath(VIDEOS_DIR, `${playlistId}.json`))) || [];
  }

  private async saveVideos(playlistId: string, videos: YouTubeVideo[]): Promise<void> {
    await writeJsonFile(getVaultPath(VIDEOS_DIR, `${playlistId}.json`), videos);
  }

  async registerPlaylist(
    playlistId: string,
    title?: string,
    tags?: string[]
  ): Promise<YouTubePlaylist & { videos: YouTubeVideo[] }> {
    await this.ensureStorage();

    // Validate playlist ID format (YouTube playlist IDs start with PL or are special like UU, OL, etc.)
    if (!playlistId || playlistId.length < 2) {
      throw new Error('Invalid YouTube playlist ID');
    }

    // Check for duplicates
    const playlists = await this.loadPlaylists();
    const existing = playlists.find(p => p.playlist_id === playlistId);
    if (existing) {
      throw new Error(`Playlist '${playlistId}' is already registered as '${existing.title}'`);
    }

    // Enumerate videos via yt-dlp
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    let rawOutput: string;
    try {
      const result = await execFileAsync('yt-dlp', [
        '--flat-playlist',
        '--print', '%(id)s\t%(title)s',
        '--', playlistUrl,
      ], { timeout: 60000 });
      rawOutput = result.stdout.trim();
    } catch (err: any) {
      throw new Error(`Failed to enumerate playlist: ${err.message}`);
    }

    if (!rawOutput) {
      throw new Error('Playlist is empty or could not be read');
    }

    const lines = rawOutput.split('\n').filter(l => l.trim());
    const now = new Date().toISOString();
    const internalId = generateId('yt');

    const videos: YouTubeVideo[] = lines.map(line => {
      const [videoId, videoTitle] = line.split('\t');
      return {
        id: generateId('ytv'),
        video_id: videoId?.trim() || '',
        playlist_id: internalId,
        title: videoTitle?.trim() || 'Untitled',
        status: 'pending' as const,
        created_at: now,
      };
    }).filter(v => v.video_id);

    const playlist: YouTubePlaylist = {
      id: internalId,
      playlist_id: playlistId,
      title: title || `Playlist ${playlistId}`,
      tags: tags || [],
      video_count: videos.length,
      indexed_count: 0,
      created_at: now,
      updated_at: now,
    };

    playlists.push(playlist);
    await this.savePlaylists(playlists);
    await this.saveVideos(internalId, videos);

    return { ...playlist, videos };
  }

  async getPlaylists(): Promise<YouTubePlaylist[]> {
    return this.loadPlaylists();
  }

  async getPlaylist(id: string): Promise<(YouTubePlaylist & { videos: YouTubeVideo[] }) | null> {
    const playlists = await this.loadPlaylists();
    const playlist = playlists.find(p => p.id === id);
    if (!playlist) return null;
    const videos = await this.loadVideos(id);
    return { ...playlist, videos };
  }

  async getVideos(playlistId?: string): Promise<YouTubeVideo[]> {
    if (playlistId) {
      return this.loadVideos(playlistId);
    }
    // Return all videos across all playlists
    const playlists = await this.loadPlaylists();
    const allVideos: YouTubeVideo[] = [];
    for (const pl of playlists) {
      const videos = await this.loadVideos(pl.id);
      allVideos.push(...videos);
    }
    return allVideos;
  }

  async indexPlaylist(
    playlistId: string,
    onProgress?: (video: YouTubeVideo, index: number, total: number) => void
  ): Promise<{ indexed: number; skipped: number; failed: number }> {
    await this.ensureStorage();

    const playlists = await this.loadPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) throw new Error(`Playlist '${playlistId}' not found`);

    const videos = await this.loadVideos(playlistId);
    const pending = videos.filter(v => v.status === 'pending' || v.status === 'failed');
    let indexed = 0;
    let skipped = 0;
    let failed = 0;

    const total = videos.length;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (video.status === 'indexed' || video.status === 'skipped') {
        skipped++;
        continue;
      }

      try {
        // Step 1: Extract transcript
        const transcript = await this.extractTranscript(video.video_id);
        if (!transcript || transcript.trim().length < 50) {
          video.status = 'skipped';
          video.error = 'No transcript available or transcript too short';
          skipped++;
          onProgress?.(video, i, total);
          continue;
        }

        // Step 2: Save raw transcript
        const transcriptPath = getVaultPath(TRANSCRIPTS_DIR, `${video.video_id}.txt`);
        await fs.writeFile(transcriptPath, transcript, 'utf-8');
        video.transcript_path = `${TRANSCRIPTS_DIR}/${video.video_id}.txt`;

        // Step 3: Summarize via cached inference (economy/Haiku)
        const summary = await cachedInference.complete(
          `Summarize this YouTube video transcript:\n\nTitle: ${video.title}\n${video.channel ? `Channel: ${video.channel}\n` : ''}\nTranscript:\n${transcript.substring(0, 12000)}`,
          SUMMARIZATION_SYSTEM_PROMPT,
          'summarization',
          'economy',
          { caller: 'youtube-indexer' }
        );

        video.summary = summary;
        video.summary_word_count = summary.split(/\s+/).length;

        // Step 4: Store in Mem0
        const memContent = `YouTube Video Summary — "${video.title}"${video.channel ? ` by ${video.channel}` : ''}:\n\n${summary}`;
        const memResult = await mem0Service.addExplicitMemory(memContent, {
          metadata: {
            source: 'youtube',
            video_id: video.video_id,
            playlist_id: playlist.playlist_id,
            title: video.title,
            channel: video.channel,
          },
        });

        if (memResult?.results?.[0]) {
          video.mem0_id = memResult.results[0].id;
        }

        // Step 5: Update status
        video.status = 'indexed';
        video.indexed_at = new Date().toISOString();
        video.error = undefined;
        indexed++;
      } catch (err: any) {
        console.error(`[YouTubeIndexer] Failed to index video ${video.video_id}:`, err.message);
        video.status = 'failed';
        video.error = err.message;
        failed++;
      }

      onProgress?.(video, i, total);

      // Save progress after each video
      await this.saveVideos(playlistId, videos);
    }

    // Update playlist stats
    playlist.indexed_count = videos.filter(v => v.status === 'indexed').length;
    playlist.last_indexed_at = new Date().toISOString();
    playlist.updated_at = new Date().toISOString();
    await this.savePlaylists(playlists);

    return { indexed, skipped, failed };
  }

  async deletePlaylist(id: string): Promise<boolean> {
    const playlists = await this.loadPlaylists();
    const idx = playlists.findIndex(p => p.id === id);
    if (idx === -1) return false;

    playlists.splice(idx, 1);
    await this.savePlaylists(playlists);

    // Remove video records (keep transcripts on disk)
    try {
      await fs.unlink(getVaultPath(VIDEOS_DIR, `${id}.json`));
    } catch {
      // File may not exist
    }

    return true;
  }

  private async extractTranscript(videoId: string): Promise<string> {
    const pythonScript = `
import json, sys
from youtube_transcript_api import YouTubeTranscriptApi

try:
    ytt_api = YouTubeTranscriptApi()
    transcript_list = ytt_api.fetch(video_id="${videoId}")
    text = " ".join(snippet.text for snippet in transcript_list)
    print(json.dumps({"text": text}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(0)
`.trim();

    try {
      const { stdout } = await execFileAsync('python3', ['-c', pythonScript], {
        timeout: 30000,
      });

      const result = JSON.parse(stdout.trim());
      if (result.error) {
        throw new Error(result.error);
      }
      return result.text || '';
    } catch (err: any) {
      if (err.message?.includes('{')) {
        // Already a parsed error
        throw err;
      }
      throw new Error(`Transcript extraction failed: ${err.message}`);
    }
  }
}

export const youtubeIndexer = new YouTubeIndexerService();
