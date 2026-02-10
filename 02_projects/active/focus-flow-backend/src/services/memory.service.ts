import axios, { AxiosInstance } from 'axios';

interface Mem0Memory {
  id: string;
  memory: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

interface Mem0SearchResult {
  id: string;
  memory: string;
  score: number;
  user_id: string;
  metadata?: Record<string, any>;
}

export class MemoryService {
  private client: AxiosInstance;
  private readonly MEM0_URL: string;
  private available = false;

  constructor() {
    this.MEM0_URL = process.env.MEM0_URL || 'http://localhost:8000';

    this.client = axios.create({
      baseURL: this.MEM0_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    // Check availability on startup
    this.healthCheck().then(ok => {
      this.available = ok;
      if (!ok) {
        console.warn('[Memory] mem0 not available - memory features disabled');
      }
    });
  }

  /**
   * Store an interaction in long-term memory
   */
  async addMemory(
    content: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<Mem0Memory | null> {
    if (!this.available) return null;

    try {
      const response = await this.client.post('/memories', {
        messages: [{ role: 'user', content }],
        user_id: userId,
        metadata,
      });
      return response.data;
    } catch (error: any) {
      console.error('[Memory] Failed to add memory:', error.message);
      return null;
    }
  }

  /**
   * Semantic search for relevant memories
   */
  async searchMemory(
    query: string,
    userId: string,
    limit = 5
  ): Promise<Mem0SearchResult[]> {
    if (!this.available) return [];

    try {
      const response = await this.client.get('/memories/search', {
        params: { query, user_id: userId, limit },
      });
      return response.data?.results || response.data || [];
    } catch (error: any) {
      console.error('[Memory] Failed to search memories:', error.message);
      return [];
    }
  }

  /**
   * Get all memories for a user
   */
  async getMemories(userId: string): Promise<Mem0Memory[]> {
    if (!this.available) return [];

    try {
      const response = await this.client.get('/memories', {
        params: { user_id: userId },
      });
      return response.data?.results || response.data || [];
    } catch (error: any) {
      console.error('[Memory] Failed to get memories:', error.message);
      return [];
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.available) return false;

    try {
      await this.client.delete(`/memories/${memoryId}`);
      return true;
    } catch (error: any) {
      console.error('[Memory] Failed to delete memory:', error.message);
      return false;
    }
  }

  /**
   * Health check for mem0 service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      this.available = response.status === 200;
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }
}

export const memoryService = new MemoryService();
