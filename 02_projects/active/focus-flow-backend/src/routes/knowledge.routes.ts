import { Router, Request, Response } from 'express';
import { youtubeIndexer } from '../services/youtube-indexer.service';

const router = Router();

// GET /knowledge/youtube/playlists — list registered playlists
router.get('/knowledge/youtube/playlists', async (req: Request, res: Response) => {
  try {
    const playlists = await youtubeIndexer.getPlaylists();
    res.json({ playlists, count: playlists.length });
  } catch (error: any) {
    console.error('[KnowledgeRoutes] Error listing playlists:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /knowledge/youtube/playlists — register a new playlist
router.post('/knowledge/youtube/playlists', async (req: Request, res: Response) => {
  try {
    const { playlist_id, title, tags } = req.body;
    if (!playlist_id) {
      return res.status(400).json({ error: 'playlist_id is required' });
    }
    const result = await youtubeIndexer.registerPlaylist(playlist_id, title, tags);
    res.status(201).json({ status: 'registered', playlist: result });
  } catch (error: any) {
    console.error('[KnowledgeRoutes] Error registering playlist:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /knowledge/youtube/playlists/:id/index — trigger indexing
router.post('/knowledge/youtube/playlists/:id/index', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const playlist = await youtubeIndexer.getPlaylist(id);
    if (!playlist) {
      return res.status(404).json({ error: `Playlist '${id}' not found` });
    }

    const progress: Array<{ video_id: string; title: string; status: string; index: number }> = [];

    const result = await youtubeIndexer.indexPlaylist(id, (video, index, total) => {
      progress.push({
        video_id: video.video_id,
        title: video.title,
        status: video.status,
        index,
      });
    });

    res.json({
      status: 'completed',
      ...result,
      progress,
    });
  } catch (error: any) {
    console.error('[KnowledgeRoutes] Error indexing playlist:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /knowledge/youtube/videos — list indexed videos
router.get('/knowledge/youtube/videos', async (req: Request, res: Response) => {
  try {
    const playlistId = req.query.playlist_id as string | undefined;
    const videos = await youtubeIndexer.getVideos(playlistId);
    res.json({ videos, count: videos.length });
  } catch (error: any) {
    console.error('[KnowledgeRoutes] Error listing videos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /knowledge/youtube/playlists/:id — remove a playlist
router.delete('/knowledge/youtube/playlists/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await youtubeIndexer.deletePlaylist(id);
    if (!deleted) {
      return res.status(404).json({ error: `Playlist '${id}' not found` });
    }
    res.json({ status: 'deleted', id });
  } catch (error: any) {
    console.error('[KnowledgeRoutes] Error deleting playlist:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
