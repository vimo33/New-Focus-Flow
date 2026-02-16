import fs from 'fs/promises';
import path from 'path';
import { getVaultPath, ensureDir } from '../utils/file-operations';

export interface InferenceLogEntry {
  timestamp: string;
  task_type: string;
  budget_tier: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cached: boolean;
  project_id?: string;
  caller?: string;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  estimated_cost_usd?: number;
  success?: boolean;
  error?: string;
}

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-opus-4-5':            { input: 5.0, output: 25.0 },
  'claude-opus-4-6':            { input: 5.0, output: 25.0 },
  'claude-haiku-4-5-20251001':  { input: 1.0, output: 5.0  },
  'openclaw:main':              { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4-6':  { input: 5.0, output: 25.0 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING['openclaw:main'];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

interface ModelStats {
  requests: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

interface DayStats {
  total_requests: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  cache_hits: number;
  by_model: Record<string, ModelStats>;
  by_task_type: Record<string, ModelStats>;
  by_caller: Record<string, ModelStats>;
}

const LOG_DIR = getVaultPath('07_system', 'logs', 'inference');
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 50;

class InferenceLogger {
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    // Don't let this timer prevent process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  log(entry: InferenceLogEntry): void {
    this.buffer.push(JSON.stringify(entry));
    if (this.buffer.length >= FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const lines = this.buffer.splice(0);
    const date = new Date().toISOString().slice(0, 10);
    const filePath = path.join(LOG_DIR, `${date}.jsonl`);

    try {
      await ensureDir(LOG_DIR);
      await fs.appendFile(filePath, lines.join('\n') + '\n', 'utf-8');
    } catch (err: any) {
      console.error('[InferenceLogger] Flush failed:', err.message);
      // Re-add lines to buffer for next attempt
      this.buffer.unshift(...lines);
    }
  }

  private newModelStats(): ModelStats {
    return { requests: 0, tokens: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
  }

  private newDayStats(): DayStats {
    return {
      total_requests: 0, total_tokens: 0, total_input_tokens: 0, total_output_tokens: 0,
      total_cost_usd: 0, cache_hits: 0, by_model: {}, by_task_type: {}, by_caller: {},
    };
  }

  private accumulateStats(bucket: Record<string, ModelStats>, key: string, entry: InferenceLogEntry): void {
    if (!bucket[key]) bucket[key] = this.newModelStats();
    const s = bucket[key];
    s.requests++;
    s.tokens += entry.total_tokens;
    s.input_tokens += entry.prompt_tokens;
    s.output_tokens += entry.completion_tokens;
    s.cost_usd += entry.estimated_cost_usd || 0;
  }

  private async readEntriesForDays(days: number): Promise<{ entries: InferenceLogEntry[]; byDate: Map<string, InferenceLogEntry[]> }> {
    const entries: InferenceLogEntry[] = [];
    const byDate = new Map<string, InferenceLogEntry[]>();

    await ensureDir(LOG_DIR);
    const files = await fs.readdir(LOG_DIR);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    for (const file of files.sort()) {
      if (!file.endsWith('.jsonl')) continue;
      const date = file.replace('.jsonl', '');
      if (date < cutoffStr) continue;

      const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
      const dateEntries: InferenceLogEntry[] = [];
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          dateEntries.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }
      byDate.set(date, dateEntries);
      entries.push(...dateEntries);
    }

    return { entries, byDate };
  }

  async getStats(days: number = 7): Promise<{ daily: Record<string, DayStats>; totals: DayStats }> {
    const totals = this.newDayStats();
    const daily: Record<string, DayStats> = {};

    try {
      const { byDate } = await this.readEntriesForDays(days);

      for (const [date, dateEntries] of byDate) {
        const dayStats = this.newDayStats();

        for (const entry of dateEntries) {
          dayStats.total_requests++;
          dayStats.total_tokens += entry.total_tokens;
          dayStats.total_input_tokens += entry.prompt_tokens;
          dayStats.total_output_tokens += entry.completion_tokens;
          dayStats.total_cost_usd += entry.estimated_cost_usd || 0;
          if (entry.cached) dayStats.cache_hits++;

          this.accumulateStats(dayStats.by_model, entry.model, entry);
          this.accumulateStats(dayStats.by_task_type, entry.task_type, entry);
          if (entry.caller) {
            this.accumulateStats(dayStats.by_caller, entry.caller, entry);
          }
        }

        daily[date] = dayStats;
        totals.total_requests += dayStats.total_requests;
        totals.total_tokens += dayStats.total_tokens;
        totals.total_input_tokens += dayStats.total_input_tokens;
        totals.total_output_tokens += dayStats.total_output_tokens;
        totals.total_cost_usd += dayStats.total_cost_usd;
        totals.cache_hits += dayStats.cache_hits;

        for (const [key, stats] of Object.entries(dayStats.by_model)) {
          if (!totals.by_model[key]) totals.by_model[key] = this.newModelStats();
          const t = totals.by_model[key];
          t.requests += stats.requests; t.tokens += stats.tokens;
          t.input_tokens += stats.input_tokens; t.output_tokens += stats.output_tokens;
          t.cost_usd += stats.cost_usd;
        }
        for (const [key, stats] of Object.entries(dayStats.by_task_type)) {
          if (!totals.by_task_type[key]) totals.by_task_type[key] = this.newModelStats();
          const t = totals.by_task_type[key];
          t.requests += stats.requests; t.tokens += stats.tokens;
          t.input_tokens += stats.input_tokens; t.output_tokens += stats.output_tokens;
          t.cost_usd += stats.cost_usd;
        }
        for (const [key, stats] of Object.entries(dayStats.by_caller)) {
          if (!totals.by_caller[key]) totals.by_caller[key] = this.newModelStats();
          const t = totals.by_caller[key];
          t.requests += stats.requests; t.tokens += stats.tokens;
          t.input_tokens += stats.input_tokens; t.output_tokens += stats.output_tokens;
          t.cost_usd += stats.cost_usd;
        }
      }
    } catch (err: any) {
      console.error('[InferenceLogger] getStats failed:', err.message);
    }

    return { daily, totals };
  }

  async getRawEntries(options: { limit?: number; offset?: number; caller?: string; days?: number } = {}): Promise<{ entries: InferenceLogEntry[]; total: number }> {
    const { limit = 100, offset = 0, caller, days = 30 } = options;

    try {
      const { entries } = await this.readEntriesForDays(days);

      // Filter by caller if specified
      let filtered = caller ? entries.filter(e => e.caller === caller) : entries;

      // Return newest-first
      filtered.reverse();

      const total = filtered.length;
      const paged = filtered.slice(offset, offset + limit);

      return { entries: paged, total };
    } catch (err: any) {
      console.error('[InferenceLogger] getRawEntries failed:', err.message);
      return { entries: [], total: 0 };
    }
  }
}

export const inferenceLogger = new InferenceLogger();
