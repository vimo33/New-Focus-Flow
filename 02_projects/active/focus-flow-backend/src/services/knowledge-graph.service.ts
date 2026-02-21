import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getVaultPath, ensureDir } from '../utils/file-operations';

const KG_DIR = getVaultPath('07_system', 'knowledge-graph');
const ENTITIES_DIR = path.join(KG_DIR, 'entities');
const DECISIONS_DIR = path.join(KG_DIR, 'decisions');
const RECONCILIATION_DIR = path.join(KG_DIR, 'reconciliation');
const RELATIONSHIPS_FILE = path.join(KG_DIR, 'relationships.jsonl');

export type EntityType = 'market' | 'competitor' | 'person' | 'project' | 'opportunity' | 'technology';

export interface KGEntity {
  id: string;
  prev_version?: string;
  entity_type: EntityType;
  name: string;
  data: Record<string, any>;
  source_report: string;
  timestamp: string;
  content_hash: string;
}

export interface KGRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  evidence: string;
  source_report: string;
  timestamp: string;
}

export interface KGDecision {
  id: string;
  recommendation: string;
  project_id?: string;
  predicted_outcome: string;
  confidence: number;
  tracking_criteria: string[];
  source_report: string;
  created_at: string;
  evaluated_at?: string;
  actual_outcome?: string;
  accuracy_score?: number;
}

export interface KGContradiction {
  id: string;
  entity_type: EntityType;
  entity_name: string;
  field: string;
  value_a: { value: any; source: string; timestamp: string };
  value_b: { value: any; source: string; timestamp: string };
  resolved: boolean;
  resolution?: string;
  detected_at: string;
}

function contentHash(data: Record<string, any>): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

function entityFile(type: EntityType): string {
  return path.join(ENTITIES_DIR, `${type}s.jsonl`);
}

class KnowledgeGraphService {
  async initialize(): Promise<void> {
    await ensureDir(ENTITIES_DIR);
    await ensureDir(DECISIONS_DIR);
    await ensureDir(RECONCILIATION_DIR);
  }

  // --- Entities ---

  async appendEntity(entity: Omit<KGEntity, 'id' | 'content_hash' | 'timestamp'>): Promise<KGEntity> {
    await this.initialize();

    const hash = contentHash(entity.data);

    // Check for content-addressed dedup
    const existing = await this.getLatestEntity(entity.entity_type, entity.name);
    if (existing && existing.content_hash === hash) {
      return existing; // No change, skip append
    }

    const versionNum = existing ? this.extractVersion(existing.id) + 1 : 1;
    const prefix = entity.entity_type.slice(0, 3);
    const nameSlug = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);

    const full: KGEntity = {
      ...entity,
      id: `${prefix}-${nameSlug}-v${versionNum}`,
      prev_version: existing?.id,
      content_hash: hash,
      timestamp: new Date().toISOString(),
    };

    const file = entityFile(entity.entity_type);
    await fs.appendFile(file, JSON.stringify(full) + '\n', 'utf-8');

    // Check for contradictions with previous version
    if (existing) {
      await this.detectContradictions(existing, full);
    }

    return full;
  }

  async getLatestEntity(type: EntityType, name: string): Promise<KGEntity | null> {
    const entries = await this.readEntityFile(type);
    const matching = entries.filter(e => e.name.toLowerCase() === name.toLowerCase());
    return matching.length > 0 ? matching[matching.length - 1] : null;
  }

  async getEntityHistory(type: EntityType, name: string): Promise<KGEntity[]> {
    const entries = await this.readEntityFile(type);
    return entries.filter(e => e.name.toLowerCase() === name.toLowerCase());
  }

  async getAllLatestEntities(type: EntityType): Promise<KGEntity[]> {
    const entries = await this.readEntityFile(type);
    const latest = new Map<string, KGEntity>();
    for (const e of entries) {
      latest.set(e.name.toLowerCase(), e);
    }
    return Array.from(latest.values());
  }

  async searchEntities(query: string, type?: EntityType): Promise<KGEntity[]> {
    const q = query.toLowerCase();
    const types: EntityType[] = type ? [type] : ['market', 'competitor', 'person', 'project', 'opportunity', 'technology'];
    const results: KGEntity[] = [];

    for (const t of types) {
      const latest = await this.getAllLatestEntities(t);
      for (const e of latest) {
        if (
          e.name.toLowerCase().includes(q) ||
          JSON.stringify(e.data).toLowerCase().includes(q)
        ) {
          results.push(e);
        }
      }
    }

    return results;
  }

  private async readEntityFile(type: EntityType): Promise<KGEntity[]> {
    const file = entityFile(type);
    try {
      const content = await fs.readFile(file, 'utf-8');
      return content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  private extractVersion(id: string): number {
    const match = id.match(/-v(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // --- Relationships ---

  async appendRelationship(rel: Omit<KGRelationship, 'id' | 'timestamp'>): Promise<KGRelationship> {
    await this.initialize();

    const full: KGRelationship = {
      ...rel,
      id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    await fs.appendFile(RELATIONSHIPS_FILE, JSON.stringify(full) + '\n', 'utf-8');
    return full;
  }

  async getRelationships(entityId?: string): Promise<KGRelationship[]> {
    try {
      const content = await fs.readFile(RELATIONSHIPS_FILE, 'utf-8');
      const all = content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l) as KGRelationship);
      if (!entityId) return all;
      return all.filter(r => r.source.includes(entityId) || r.target.includes(entityId));
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  // --- Decisions ---

  async recordDecision(decision: Omit<KGDecision, 'id' | 'created_at'>): Promise<KGDecision> {
    await this.initialize();

    const full: KGDecision = {
      ...decision,
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    const file = path.join(DECISIONS_DIR, `${full.id}.json`);
    await fs.writeFile(file, JSON.stringify(full, null, 2), 'utf-8');
    return full;
  }

  async evaluateDecision(decisionId: string, actual_outcome: string, accuracy_score: number): Promise<KGDecision | null> {
    const file = path.join(DECISIONS_DIR, `${decisionId}.json`);
    try {
      const content = await fs.readFile(file, 'utf-8');
      const decision: KGDecision = JSON.parse(content);
      decision.evaluated_at = new Date().toISOString();
      decision.actual_outcome = actual_outcome;
      decision.accuracy_score = accuracy_score;
      await fs.writeFile(file, JSON.stringify(decision, null, 2), 'utf-8');
      return decision;
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async getDecisions(options: { evaluated?: boolean; project_id?: string } = {}): Promise<KGDecision[]> {
    await this.initialize();
    const files = await fs.readdir(DECISIONS_DIR);
    const decisions: KGDecision[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(DECISIONS_DIR, file), 'utf-8');
      const dec: KGDecision = JSON.parse(content);

      if (options.evaluated !== undefined) {
        const isEvaluated = !!dec.evaluated_at;
        if (options.evaluated !== isEvaluated) continue;
      }
      if (options.project_id && dec.project_id !== options.project_id) continue;

      decisions.push(dec);
    }

    return decisions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getDecisionAccuracy(): Promise<{ total: number; evaluated: number; avg_accuracy: number; by_source: Record<string, { count: number; avg_accuracy: number }> }> {
    const all = await this.getDecisions();
    const evaluated = all.filter(d => d.accuracy_score !== undefined);

    const bySource: Record<string, { count: number; total_accuracy: number }> = {};
    for (const d of evaluated) {
      const src = d.source_report.split('-').slice(0, 2).join('-');
      if (!bySource[src]) bySource[src] = { count: 0, total_accuracy: 0 };
      bySource[src].count++;
      bySource[src].total_accuracy += d.accuracy_score!;
    }

    return {
      total: all.length,
      evaluated: evaluated.length,
      avg_accuracy: evaluated.length > 0
        ? Math.round((evaluated.reduce((s, d) => s + d.accuracy_score!, 0) / evaluated.length) * 100) / 100
        : 0,
      by_source: Object.fromEntries(
        Object.entries(bySource).map(([k, v]) => [k, { count: v.count, avg_accuracy: Math.round((v.total_accuracy / v.count) * 100) / 100 }])
      ),
    };
  }

  // --- Contradictions ---

  private async detectContradictions(prev: KGEntity, curr: KGEntity): Promise<void> {
    const prevData = prev.data;
    const currData = curr.data;

    for (const key of Object.keys(currData)) {
      if (prevData[key] !== undefined && JSON.stringify(prevData[key]) !== JSON.stringify(currData[key])) {
        // Check if this is a meaningful contradiction (not just an update)
        if (typeof prevData[key] === 'string' && typeof currData[key] === 'string') {
          // Strings that are completely different may be contradictions
          const contradiction: KGContradiction = {
            id: `contra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            entity_type: curr.entity_type,
            entity_name: curr.name,
            field: key,
            value_a: { value: prevData[key], source: prev.source_report, timestamp: prev.timestamp },
            value_b: { value: currData[key], source: curr.source_report, timestamp: curr.timestamp },
            resolved: false,
            detected_at: new Date().toISOString(),
          };

          const file = path.join(RECONCILIATION_DIR, `${contradiction.id}.json`);
          await fs.writeFile(file, JSON.stringify(contradiction, null, 2), 'utf-8');
        }
      }
    }
  }

  async getContradictions(resolved?: boolean): Promise<KGContradiction[]> {
    await this.initialize();
    const files = await fs.readdir(RECONCILIATION_DIR);
    const results: KGContradiction[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(RECONCILIATION_DIR, file), 'utf-8');
      const c: KGContradiction = JSON.parse(content);
      if (resolved !== undefined && c.resolved !== resolved) continue;
      results.push(c);
    }

    return results.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  }

  async resolveContradiction(id: string, resolution: string): Promise<KGContradiction | null> {
    const file = path.join(RECONCILIATION_DIR, `${id}.json`);
    try {
      const content = await fs.readFile(file, 'utf-8');
      const c: KGContradiction = JSON.parse(content);
      c.resolved = true;
      c.resolution = resolution;
      await fs.writeFile(file, JSON.stringify(c, null, 2), 'utf-8');
      return c;
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  // --- Stats ---

  async getStats(): Promise<{
    entity_counts: Record<EntityType, number>;
    total_entities: number;
    total_relationships: number;
    total_decisions: number;
    pending_contradictions: number;
    decision_accuracy: number;
  }> {
    const types: EntityType[] = ['market', 'competitor', 'person', 'project', 'opportunity', 'technology'];
    const counts: Record<string, number> = {};
    let total = 0;

    for (const t of types) {
      const latest = await this.getAllLatestEntities(t);
      counts[t] = latest.length;
      total += latest.length;
    }

    const rels = await this.getRelationships();
    const decisions = await this.getDecisions();
    const contradictions = await this.getContradictions(false);
    const accuracy = await this.getDecisionAccuracy();

    return {
      entity_counts: counts as Record<EntityType, number>,
      total_entities: total,
      total_relationships: rels.length,
      total_decisions: decisions.length,
      pending_contradictions: contradictions.length,
      decision_accuracy: accuracy.avg_accuracy,
    };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
