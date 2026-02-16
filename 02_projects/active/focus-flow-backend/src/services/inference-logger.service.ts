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
}

interface DayStats {
  total_requests: number;
  total_tokens: number;
  cache_hits: number;
  by_model: Record<string, { requests: number; tokens: number }>;
  by_task_type: Record<string, { requests: number; tokens: number }>;
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

  async getStats(days: number = 7): Promise<{ daily: Record<string, DayStats>; totals: DayStats }> {
    const totals: DayStats = {
      total_requests: 0,
      total_tokens: 0,
      cache_hits: 0,
      by_model: {},
      by_task_type: {},
    };
    const daily: Record<string, DayStats> = {};

    try {
      await ensureDir(LOG_DIR);
      const files = await fs.readdir(LOG_DIR);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const date = file.replace('.jsonl', '');
        if (date < cutoffStr) continue;

        const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
        const dayStats: DayStats = {
          total_requests: 0,
          total_tokens: 0,
          cache_hits: 0,
          by_model: {},
          by_task_type: {},
        };

        for (const line of content.split('\n')) {
          if (!line.trim()) continue;
          try {
            const entry: InferenceLogEntry = JSON.parse(line);
            dayStats.total_requests++;
            dayStats.total_tokens += entry.total_tokens;
            if (entry.cached) dayStats.cache_hits++;

            if (!dayStats.by_model[entry.model]) {
              dayStats.by_model[entry.model] = { requests: 0, tokens: 0 };
            }
            dayStats.by_model[entry.model].requests++;
            dayStats.by_model[entry.model].tokens += entry.total_tokens;

            if (!dayStats.by_task_type[entry.task_type]) {
              dayStats.by_task_type[entry.task_type] = { requests: 0, tokens: 0 };
            }
            dayStats.by_task_type[entry.task_type].requests++;
            dayStats.by_task_type[entry.task_type].tokens += entry.total_tokens;
          } catch {
            // Skip malformed lines
          }
        }

        daily[date] = dayStats;
        totals.total_requests += dayStats.total_requests;
        totals.total_tokens += dayStats.total_tokens;
        totals.cache_hits += dayStats.cache_hits;

        for (const [model, stats] of Object.entries(dayStats.by_model)) {
          if (!totals.by_model[model]) totals.by_model[model] = { requests: 0, tokens: 0 };
          totals.by_model[model].requests += stats.requests;
          totals.by_model[model].tokens += stats.tokens;
        }
        for (const [taskType, stats] of Object.entries(dayStats.by_task_type)) {
          if (!totals.by_task_type[taskType]) totals.by_task_type[taskType] = { requests: 0, tokens: 0 };
          totals.by_task_type[taskType].requests += stats.requests;
          totals.by_task_type[taskType].tokens += stats.tokens;
        }
      }
    } catch (err: any) {
      console.error('[InferenceLogger] getStats failed:', err.message);
    }

    return { daily, totals };
  }
}

export const inferenceLogger = new InferenceLogger();
