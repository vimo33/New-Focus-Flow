/**
 * Decision Log Service - Persistent decision tracking for Focus Flow OS
 *
 * Stores decisions as JSON files in the vault. Auto-syncs each decision
 * to Mem0 for semantic search and AI context assembly.
 */

import path from 'path';
import {
  DecisionEntry,
  DecisionType,
  DecisionOutcome,
  DecisionSource,
} from '../models/types';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  deleteFile,
  listFiles,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { mem0Service } from './mem0.service';

const DECISIONS_DIR = getVaultPath('07_system', 'decisions');
const LOG_PREFIX = '[DecisionLog]';

function decisionPath(id: string): string {
  return path.join(DECISIONS_DIR, `${id}.json`);
}

interface CreateDecisionInput {
  project_id: string;
  decision_type: DecisionType;
  context: string;
  decision: string;
  reasoning: string;
  alternatives?: string[];
  outcome?: DecisionOutcome;
  source?: DecisionSource;
}

class DecisionLogService {
  constructor() {
    ensureDir(DECISIONS_DIR).catch((err) =>
      console.error(`${LOG_PREFIX} Failed to ensure decisions directory:`, err.message)
    );
  }

  async createDecision(input: CreateDecisionInput): Promise<DecisionEntry> {
    const entry: DecisionEntry = {
      id: generateId('dec'),
      project_id: input.project_id,
      timestamp: new Date().toISOString(),
      decision_type: input.decision_type,
      context: input.context,
      decision: input.decision,
      reasoning: input.reasoning,
      alternatives: input.alternatives || [],
      outcome: input.outcome || 'pending',
      source: input.source || 'user',
    };

    await writeJsonFile(decisionPath(entry.id), entry);
    console.log(`${LOG_PREFIX} Created decision ${entry.id} for project ${entry.project_id}`);

    // Sync to Mem0
    this.syncToMem0(entry).catch((err) =>
      console.error(`${LOG_PREFIX} Mem0 sync failed for ${entry.id}:`, err.message)
    );

    return entry;
  }

  async getDecision(id: string): Promise<DecisionEntry | null> {
    return readJsonFile<DecisionEntry>(decisionPath(id));
  }

  async getDecisions(projectId?: string): Promise<DecisionEntry[]> {
    const files = await listFiles(DECISIONS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const decisions: DecisionEntry[] = [];
    for (const file of jsonFiles) {
      const entry = await readJsonFile<DecisionEntry>(path.join(DECISIONS_DIR, file));
      if (entry) {
        if (!projectId || entry.project_id === projectId) {
          decisions.push(entry);
        }
      }
    }

    // Sort by timestamp descending (newest first)
    decisions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return decisions;
  }

  async updateDecision(
    id: string,
    updates: Partial<Pick<DecisionEntry, 'outcome' | 'reasoning' | 'decision'>>
  ): Promise<DecisionEntry | null> {
    const existing = await this.getDecision(id);
    if (!existing) return null;

    const updated: DecisionEntry = { ...existing, ...updates };
    await writeJsonFile(decisionPath(id), updated);
    console.log(`${LOG_PREFIX} Updated decision ${id}`);

    // Re-sync to Mem0
    this.syncToMem0(updated).catch((err) =>
      console.error(`${LOG_PREFIX} Mem0 sync failed for ${id}:`, err.message)
    );

    return updated;
  }

  async deleteDecision(id: string): Promise<boolean> {
    const existing = await this.getDecision(id);
    if (!existing) return false;

    await deleteFile(decisionPath(id));
    console.log(`${LOG_PREFIX} Deleted decision ${id}`);
    return true;
  }

  /**
   * Sync a decision entry to Mem0 as an explicit memory.
   */
  private async syncToMem0(entry: DecisionEntry): Promise<void> {
    const content = `Decision [${entry.decision_type}]: ${entry.decision}. Reasoning: ${entry.reasoning}. Outcome: ${entry.outcome}.`;

    await mem0Service.addExplicitMemory(content, {
      projectId: entry.project_id,
      tags: ['decision', entry.decision_type],
      metadata: {
        decision_id: entry.id,
        source: entry.source,
      },
    });
  }
}

export const decisionLogService = new DecisionLogService();
