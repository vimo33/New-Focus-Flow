import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

/**
 * Transcription Service - Handles voice transcription using OpenAI Whisper API
 *
 * Responsibilities:
 * - Download audio files from Telegram
 * - Transcribe audio to text using Whisper API
 * - Handle different audio formats
 * - Manage API errors and retries
 * - Clean up temporary files
 */

interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
}

class TranscriptionService {
  private openai: OpenAI;
  private tempDir: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment variables. Transcription will fail.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });

    // Set up temporary directory for audio files
    this.tempDir = path.join(process.cwd(), 'temp', 'audio');
    this.ensureTempDir();
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Transcribe audio file to text using OpenAI Whisper API
   * Supports various audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
   */
  async transcribeAudio(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      console.log(`🎤 Transcribing audio file: ${audioPath}`);

      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Get file size
      const stats = fs.statSync(audioPath);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Create readable stream from file
      const audioStream = fs.createReadStream(audioPath);

      // Call Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream as any,
        model: 'whisper-1',
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature || 0,
        response_format: 'verbose_json',
      });

      console.log(`✅ Transcription completed: ${transcription.text.substring(0, 50)}...`);

      return {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
      };
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Download audio file from buffer/stream
   */
  private async saveAudioFile(buffer: Buffer, filename: string): Promise<string> {
    const filepath = path.join(this.tempDir, filename);

    return new Promise((resolve, reject) => {
      fs.writeFile(filepath, buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`💾 Saved audio file: ${filepath}`);
          resolve(filepath);
        }
      });
    });
  }

  /**
   * Transcribe from buffer (for Telegram voice/audio)
   */
  async transcribeFromBuffer(
    buffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    let tempFilePath: string | null = null;

    try {
      // Save buffer to temporary file
      tempFilePath = await this.saveAudioFile(buffer, filename);

      // Transcribe the file
      const result = await this.transcribeAudio(tempFilePath, options);

      return result;
    } catch (error) {
      console.error('❌ Error transcribing from buffer:', error);
      throw error;
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        this.cleanupFile(tempFilePath);
      }
    }
  }

  /**
   * Clean up temporary file
   */
  private cleanupFile(filepath: string): void {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️  Cleaned up temp file: ${filepath}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to cleanup temp file:', error);
    }
  }

  /**
   * Check if transcription API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not configured');
        return false;
      }

      // Try to list models as a simple health check
      await this.openai.models.list();

      console.log('✅ Transcription Service: Health check passed');
      return true;
    } catch (error) {
      console.error('❌ Transcription service health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up all temporary files (useful for shutdown)
   */
  async cleanupAllTempFiles(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          const filepath = path.join(this.tempDir, file);
          fs.unlinkSync(filepath);
        }
        console.log(`🗑️  Cleaned up ${files.length} temp files`);
      }
    } catch (error) {
      console.error('⚠️  Failed to cleanup all temp files:', error);
    }
  }
}

export default new TranscriptionService();
