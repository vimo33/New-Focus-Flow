/**
 * Pattern Memory Service — Extract learnings from experiments, detect cross-project patterns.
 * Every decision generates a learning. Patterns evolve playbooks.
 */

import { db } from '../db/connection';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';
import { agentMemoryService } from './agent-memory.service';

type PatternCategory = 'success_pattern' | 'failure_pattern' | 'market_signal' | 'timing_pattern';

interface ExtractedPattern {
  pattern: string;
  category: PatternCategory;
  tags: string[];
  confidence: number;
  appliesTo: string[];
}

/**
 * Extract patterns from a completed experiment with a decision.
 * Called as a side effect after recordDecision().
 */
async function extractFromExperiment(experimentId: string, teamId: string): Promise<ExtractedPattern[]> {
  const [experiment] = await db
    .select()
    .from(schema.experiments)
    .where(eq(schema.experiments.id, experimentId))
    .limit(1);

  if (!experiment || !experiment.decision) return [];

  // Get hypothesis for context
  let hypothesisType = 'unknown';
  let hypothesisStatement = '';
  if (experiment.hypothesisId) {
    const [hypothesis] = await db
      .select()
      .from(schema.hypotheses)
      .where(eq(schema.hypotheses.id, experiment.hypothesisId))
      .limit(1);
    if (hypothesis) {
      hypothesisType = hypothesis.type;
      hypothesisStatement = hypothesis.statement;
    }
  }

  const results = experiment.resultsJson as any;
  const patterns: ExtractedPattern[] = [];

  // Determine category based on decision
  const isPositive = experiment.decision === 'scale' || experiment.decision === 'iterate';
  const category: PatternCategory = isPositive ? 'success_pattern' : 'failure_pattern';

  // Extract the primary pattern
  const lift = results?.lift;
  const liftStr = lift ? ` (${lift > 0 ? '+' : ''}${(lift * 100).toFixed(0)}% lift)` : '';

  patterns.push({
    pattern: `${hypothesisType} hypothesis "${hypothesisStatement}" → ${experiment.decision}${liftStr}. Metric: ${experiment.metricName}. ${experiment.decisionRationale || ''}`.trim(),
    category,
    tags: [hypothesisType, experiment.metricName, experiment.decision],
    confidence: results?.p_value ? Math.max(0, 1 - results.p_value) : 0.5,
    appliesTo: [hypothesisType],
  });

  // Extract timing pattern if experiment ran
  if (experiment.startAt && experiment.endAt) {
    const start = new Date(experiment.startAt);
    const end = new Date(experiment.endAt);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    patterns.push({
      pattern: `${hypothesisType} experiment took ${days} days to complete. ${days <= 7 ? 'Fast validation possible.' : days <= 14 ? 'Standard timeframe.' : 'Longer than typical.'}`,
      category: 'timing_pattern',
      tags: [hypothesisType, 'duration'],
      confidence: 0.7,
      appliesTo: [hypothesisType],
    });
  }

  // Store patterns
  for (const p of patterns) {
    await db.insert(schema.patternMemory).values({
      teamId,
      projectId: experiment.projectId,
      experimentId,
      pattern: p.pattern,
      category: p.category,
      tags: p.tags,
      confidence: p.confidence,
      appliesTo: p.appliesTo,
    } as any);
  }

  await audit(teamId, null, null, 'pattern.extract', 'pattern_memory', experimentId, {
    patternsExtracted: patterns.length,
  });

  // Also write to Qdrant for semantic retrieval by agents
  for (const p of patterns) {
    agentMemoryService.recordPattern(
      p.pattern,
      p.category,
      p.appliesTo,
      p.confidence
    ).catch(err => console.error('[PatternMemory] Failed to write to Qdrant:', err.message));
  }

  return patterns;
}

async function search(query: string, teamId: string) {
  // Simple text search on pattern field
  return db
    .select()
    .from(schema.patternMemory)
    .where(
      and(
        eq(schema.patternMemory.teamId, teamId),
        sql`${schema.patternMemory.pattern} ILIKE ${'%' + query + '%'}`
      )
    )
    .orderBy(desc(schema.patternMemory.createdAt))
    .limit(20);
}

async function getCrossProjectPatterns(teamId: string) {
  const patterns = await db
    .select()
    .from(schema.patternMemory)
    .where(eq(schema.patternMemory.teamId, teamId))
    .orderBy(desc(schema.patternMemory.createdAt));

  // Group by tags
  const tagGroups = new Map<string, typeof patterns>();
  for (const p of patterns) {
    for (const tag of (p.tags || [])) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, []);
      tagGroups.get(tag)!.push(p);
    }
  }

  // Find recurring themes (tags with 3+ patterns)
  const recurring = Array.from(tagGroups.entries())
    .filter(([, patterns]) => patterns.length >= 3)
    .map(([tag, patterns]) => ({
      tag,
      count: patterns.length,
      categories: [...new Set(patterns.map(p => p.category))],
      sample_patterns: patterns.slice(0, 3).map(p => p.pattern),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total_patterns: patterns.length,
    recurring_themes: recurring,
    by_category: {
      success: patterns.filter(p => p.category === 'success_pattern').length,
      failure: patterns.filter(p => p.category === 'failure_pattern').length,
      market: patterns.filter(p => p.category === 'market_signal').length,
      timing: patterns.filter(p => p.category === 'timing_pattern').length,
    },
  };
}

async function suggestPatternsForProject(projectId: string, teamId: string) {
  // Get project tags
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);

  if (!project) return [];

  // Find patterns that might apply
  const patterns = await db
    .select()
    .from(schema.patternMemory)
    .where(eq(schema.patternMemory.teamId, teamId))
    .orderBy(desc(schema.patternMemory.confidence))
    .limit(50);

  // Score relevance: patterns from other projects are more valuable (cross-pollination)
  return patterns
    .filter(p => p.projectId !== projectId)
    .slice(0, 10);
}

async function getAll(teamId: string, category?: string, limit: number = 50) {
  const conditions = [eq(schema.patternMemory.teamId, teamId)];

  if (category) {
    conditions.push(eq(schema.patternMemory.category, category as any));
  }

  return db
    .select()
    .from(schema.patternMemory)
    .where(and(...conditions))
    .orderBy(desc(schema.patternMemory.createdAt))
    .limit(limit);
}

export const patternMemoryService = {
  extractFromExperiment,
  search,
  getCrossProjectPatterns,
  suggestPatternsForProject,
  getAll,
};
