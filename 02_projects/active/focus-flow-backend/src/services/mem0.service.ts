/**
 * Mem0 Memory Service - Semantic memory layer for Focus Flow OS
 *
 * Implements Mem0-style memory extraction and semantic search using:
 * - Qdrant for vector storage (already running on port 6333)
 * - FastEmbed (BAAI/bge-small-en-v1.5) for local embeddings — no API calls
 * - OpenClaw Haiku for memory fact extraction from conversations
 *
 * Graceful degradation: all methods return empty/null when unavailable.
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import crypto from 'crypto';
import { openClawClient } from './openclaw-client.service';

const LOG_PREFIX = '[Mem0]';
const DEFAULT_USER = 'focus-flow-user';
const DEFAULT_TOKEN_BUDGET = 4000;
const COLLECTION_NAME = 'focus-flow-memories';
const EMBEDDING_DIM = 384; // BAAI/bge-small-en-v1.5

export interface MemoryItem {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface Mem0AddOptions {
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

interface Mem0SearchOptions {
  userId?: string;
  projectId?: string;
  limit?: number;
}

interface AddResult {
  results: MemoryItem[];
}

const EXTRACTION_PROMPT = `You are a memory extraction assistant. Analyze the conversation and extract key facts, decisions, preferences, and important information that would be useful to remember for future conversations.

For each distinct fact or piece of information, output it as a separate line starting with "- ".

Rules:
- Extract concrete facts, decisions, and preferences (not vague observations)
- Each fact should be self-contained and understandable without context
- Include project names, technical decisions, user preferences, deadlines, etc.
- If the conversation doesn't contain memorable facts, respond with "NONE"
- Keep each fact to 1-2 sentences max

Example output:
- User prefers TypeScript over JavaScript for backend services
- The project deadline for Phase 1 is March 15, 2026
- The team decided to use Qdrant for vector storage instead of Pinecone`;

class Mem0Service {
  private qdrant: QdrantClient | null = null;
  private embedder: FlagEmbedding | null = null;
  private available = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const openclawToken = process.env.OPENCLAW_AUTH_TOKEN;
    if (!openclawToken) {
      console.warn(`${LOG_PREFIX} OPENCLAW_AUTH_TOKEN not configured — memory features disabled`);
      return;
    }

    try {
      this.qdrant = new QdrantClient({ host: 'localhost', port: 6333 });
      this.embedder = await FlagEmbedding.init({
        model: EmbeddingModel.BGESmallENV15,
      });
      await this.ensureCollection();
      this.available = true;
      console.log(`${LOG_PREFIX} Initialized (OpenClaw Haiku + local FastEmbed BGE-small + Qdrant)`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to initialize:`, error.message);
      this.available = false;
    }
  }

  private async ensureCollection(): Promise<void> {
    if (!this.qdrant) return;

    try {
      const collections = await this.qdrant.getCollections();
      const existing = collections.collections.find(c => c.name === COLLECTION_NAME);

      if (existing) {
        const info = await this.qdrant.getCollection(COLLECTION_NAME);
        const currentDim = (info.config?.params?.vectors as any)?.size;
        if (currentDim && currentDim !== EMBEDDING_DIM) {
          console.log(`${LOG_PREFIX} Recreating collection (dim ${currentDim} → ${EMBEDDING_DIM})`);
          await this.qdrant.deleteCollection(COLLECTION_NAME);
        } else {
          return;
        }
      }

      await this.qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
      });
      console.log(`${LOG_PREFIX} Created Qdrant collection: ${COLLECTION_NAME} (${EMBEDDING_DIM}d)`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to ensure collection:`, error.message);
      throw error;
    }
  }

  private async embed(text: string): Promise<number[]> {
    if (!this.embedder) throw new Error('Embedder not initialized');
    const result = await this.embedder.queryEmbed(text);
    return Array.from(result);
  }

  private async extractFacts(
    messages: Array<{ role: string; content: string }>
  ): Promise<string[]> {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const text = await openClawClient.complete(
      `${EXTRACTION_PROMPT}\n\nConversation:\n${conversationText}`,
      undefined,
      { maxTokens: 1000, temperature: 0.3 }
    );

    if (text.trim() === 'NONE') return [];

    return text
      .split('\n')
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.trim().substring(2).trim())
      .filter(fact => fact.length > 0);
  }

  private async ensureReady(): Promise<boolean> {
    await this.initPromise;
    return this.available;
  }

  /**
   * Store conversation messages as memories.
   * Uses Haiku to extract key facts, then embeds and stores each.
   */
  async addMemories(
    messages: Array<{ role: string; content: string }>,
    options: Mem0AddOptions = {}
  ): Promise<AddResult | null> {
    if (!(await this.ensureReady())) return null;

    try {
      const facts = await this.extractFacts(messages);
      if (facts.length === 0) return { results: [] };

      const storedItems: MemoryItem[] = [];

      for (const fact of facts) {
        const id = crypto.randomUUID();
        const vector = await this.embed(fact);
        const now = new Date().toISOString();

        const payload: Record<string, any> = {
          memory: fact,
          user_id: options.userId || DEFAULT_USER,
          created_at: now,
          updated_at: now,
          ...options.metadata,
        };

        if (options.projectId) {
          payload.project_id = options.projectId;
        }

        await this.qdrant!.upsert(COLLECTION_NAME, {
          points: [{ id, vector, payload }],
        });

        storedItems.push({ id, memory: fact, metadata: payload, created_at: now });
      }

      return { results: storedItems };
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to add memories:`, error.message);
      return null;
    }
  }

  /**
   * Store an explicit fact/decision/preference as a memory.
   */
  async addExplicitMemory(
    content: string,
    options: Mem0AddOptions & { tags?: string[] } = {}
  ): Promise<AddResult | null> {
    if (!(await this.ensureReady())) return null;

    try {
      const id = crypto.randomUUID();
      const vector = await this.embed(content);
      const now = new Date().toISOString();

      const payload: Record<string, any> = {
        memory: content,
        user_id: options.userId || DEFAULT_USER,
        created_at: now,
        updated_at: now,
        ...options.metadata,
      };

      if (options.projectId) {
        payload.project_id = options.projectId;
      }
      if (options.tags) {
        payload.tags = options.tags;
      }

      await this.qdrant!.upsert(COLLECTION_NAME, {
        points: [{ id, vector, payload }],
      });

      return { results: [{ id, memory: content, metadata: payload, created_at: now }] };
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to add explicit memory:`, error.message);
      return null;
    }
  }

  /**
   * Semantic search for relevant memories.
   * Optionally filter by project.
   */
  async searchMemories(
    query: string,
    options: Mem0SearchOptions = {}
  ): Promise<MemoryItem[]> {
    if (!(await this.ensureReady())) return [];

    try {
      const vector = await this.embed(query);
      const limit = options.limit || 10;

      const filter: any = {
        must: [
          {
            key: 'user_id',
            match: { value: options.userId || DEFAULT_USER },
          },
        ],
      };

      if (options.projectId) {
        filter.must.push({
          key: 'project_id',
          match: { value: options.projectId },
        });
      }

      const results = await this.qdrant!.search(COLLECTION_NAME, {
        vector,
        limit,
        filter,
        with_payload: true,
      });

      return results.map(r => ({
        id: String(r.id),
        memory: (r.payload as any)?.memory || '',
        score: r.score,
        metadata: r.payload as Record<string, any>,
        created_at: (r.payload as any)?.created_at,
        updated_at: (r.payload as any)?.updated_at,
      }));
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to search memories:`, error.message);
      return [];
    }
  }

  /**
   * Get all memories for a specific project.
   */
  async getProjectMemories(
    projectId: string,
    limit = 50
  ): Promise<MemoryItem[]> {
    if (!(await this.ensureReady())) return [];

    try {
      const results = await this.qdrant!.scroll(COLLECTION_NAME, {
        filter: {
          must: [
            { key: 'project_id', match: { value: projectId } },
          ],
        },
        limit,
        with_payload: true,
      });

      return (results.points || []).map(r => ({
        id: String(r.id),
        memory: (r.payload as any)?.memory || '',
        metadata: r.payload as Record<string, any>,
        created_at: (r.payload as any)?.created_at,
        updated_at: (r.payload as any)?.updated_at,
      }));
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to get project memories:`, error.message);
      return [];
    }
  }

  /**
   * Assemble a formatted context block from project memories.
   * Returns markdown ready to inject into AI system prompts.
   */
  async assembleContext(
    projectId: string,
    query: string,
    tokenBudget: number = DEFAULT_TOKEN_BUDGET
  ): Promise<string> {
    if (!(await this.ensureReady())) return '';

    try {
      const memories = await this.searchMemories(query, {
        projectId,
        limit: 20,
      });

      if (memories.length === 0) return '';

      const lines: string[] = ['## Project Memory Context\n'];
      let charCount = lines[0].length;

      for (const mem of memories) {
        const tags = mem.metadata?.tags
          ? ` [${(mem.metadata.tags as string[]).join(', ')}]`
          : '';
        const line = `- ${mem.memory}${tags}\n`;

        if (charCount + line.length > tokenBudget) break;

        lines.push(line);
        charCount += line.length;
      }

      return lines.join('');
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to assemble context:`, error.message);
      return '';
    }
  }

  /**
   * Delete a specific memory by ID.
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!(await this.ensureReady())) return false;

    try {
      await this.qdrant!.delete(COLLECTION_NAME, {
        points: [memoryId],
      });
      return true;
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to delete memory:`, error.message);
      return false;
    }
  }

  /**
   * Get a single memory by ID.
   */
  async getMemory(memoryId: string): Promise<MemoryItem | null> {
    if (!(await this.ensureReady())) return null;

    try {
      const results = await this.qdrant!.retrieve(COLLECTION_NAME, {
        ids: [memoryId],
        with_payload: true,
      });

      if (results.length === 0) return null;

      const r = results[0];
      return {
        id: String(r.id),
        memory: (r.payload as any)?.memory || '',
        metadata: r.payload as Record<string, any>,
        created_at: (r.payload as any)?.created_at,
        updated_at: (r.payload as any)?.updated_at,
      };
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to get memory:`, error.message);
      return null;
    }
  }

  /**
   * Health check — verifies Qdrant connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureReady();
      if (!this.available || !this.qdrant) return false;

      const collections = await this.qdrant.getCollections();
      return collections.collections.some(c => c.name === COLLECTION_NAME);
    } catch {
      return false;
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }
}

export const mem0Service = new Mem0Service();
