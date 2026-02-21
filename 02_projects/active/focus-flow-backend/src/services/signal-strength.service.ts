/**
 * Signal Strength Service — Core computation engine for the Validation Engine.
 *
 * Computes a 0-100 score per project aggregating: council verdicts, experiment results,
 * market signals, network advantage, revenue proximity, and founder enjoyment.
 * Applies threshold rules to generate kill/scale/park recommendations.
 */

import { db } from '../db/connection';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import * as schema from '../db/schema';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type {
  SignalStrengthBreakdown,
  SignalStrengthWeights,
  ThresholdConfig,
  KillScaleRecommendation,
  SignalTrend,
  PortfolioPruningRecommendation,
  ValidationEngineOverview,
} from '../models/types';

const VAULT_ROOT = '/srv/focus-flow';
const WEIGHTS_PATH = join(VAULT_ROOT, '07_system/config/signal-weights.json');
const THRESHOLD_PATH = join(VAULT_ROOT, '07_system/config/threshold-config.json');

// ─── Config Loading ─────────────────────────────────────────────────────────

async function loadWeights(archetype?: string | null): Promise<SignalStrengthWeights> {
  try {
    const raw = await readFile(WEIGHTS_PATH, 'utf-8');
    const config = JSON.parse(raw);
    if (archetype && config.archetypes?.[archetype]) {
      return config.archetypes[archetype];
    }
    return config.default;
  } catch {
    return {
      experiment_score: 0.25,
      council_score: 0.20,
      revenue_proximity: 0.20,
      market_signals: 0.15,
      enjoyment_score: 0.10,
      network_advantage: 0.10,
    };
  }
}

async function loadThresholds(): Promise<ThresholdConfig> {
  try {
    const raw = await readFile(THRESHOLD_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      kill_threshold: 30,
      kill_days_required: 14,
      scale_threshold: 70,
      scale_positive_experiments: 2,
      park_threshold: 40,
      park_days_required: 21,
    };
  }
}

// ─── Component Score Calculators ────────────────────────────────────────────

/**
 * Council score: Load vault project JSON → council_verdict.overall_score * 10
 */
async function computeCouncilScore(projectId: string): Promise<number> {
  try {
    const projectDir = join(VAULT_ROOT, '02_projects/active');
    const { readdirSync, readFileSync } = require('fs');
    const files = readdirSync(projectDir).filter((f: string) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(projectDir, file), 'utf-8'));
        if (data.id === projectId && data.artifacts?.council_verdict) {
          const score = data.artifacts.council_verdict.overall_score;
          return Math.min(100, Math.max(0, (score || 5) * 10));
        }
      } catch { continue; }
    }
  } catch { /* no vault data */ }
  return 50; // default neutral
}

/**
 * Experiment score: weighted by completion rate, positive results, lift
 */
async function computeExperimentScore(projectId: string): Promise<number> {
  const experiments = await db
    .select()
    .from(schema.experiments)
    .where(eq(schema.experiments.projectId, projectId));

  if (experiments.length === 0) return 0;

  const completed = experiments.filter(e => e.status === 'completed');
  const withResults = completed.filter(e => e.resultsJson);
  const positive = withResults.filter(e => {
    const r = e.resultsJson as any;
    return r && r.lift && r.lift > 0;
  });

  const completionRate = completed.length / experiments.length;
  const positiveRate = withResults.length > 0 ? positive.length / withResults.length : 0;

  const avgLift = positive.length > 0
    ? positive.reduce((sum, e) => sum + ((e.resultsJson as any)?.lift || 0), 0) / positive.length
    : 0;

  // Score: 40% completion rate + 40% positive rate + 20% lift magnitude (capped at 50%)
  const liftScore = Math.min(1, avgLift / 0.5);
  return Math.round((completionRate * 40 + positiveRate * 40 + liftScore * 20));
}

/**
 * Market signals: aggregate positive/negative/neutral from signals table
 */
async function computeMarketSignalScore(projectId: string): Promise<number> {
  const signals = await db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.projectId, projectId));

  if (signals.length === 0) return 50; // neutral

  let positive = 0, negative = 0, neutral = 0;
  for (const s of signals) {
    const val = s.valueJson as any;
    const sentiment = val?.sentiment || s.type;
    if (sentiment === 'positive' || sentiment === 'bullish') positive++;
    else if (sentiment === 'negative' || sentiment === 'bearish') negative++;
    else neutral++;
  }

  const total = positive + negative + neutral;
  if (total === 0) return 50;

  // Score: positive pulls toward 100, negative toward 0
  return Math.round(((positive - negative) / total + 1) * 50);
}

/**
 * Network advantage: count contacts with project_relevance for this project
 */
async function computeNetworkScore(projectId: string): Promise<number> {
  try {
    const contactsDir = join(VAULT_ROOT, '04_network/contacts');
    if (!existsSync(contactsDir)) return 0;

    const { readdirSync, readFileSync } = require('fs');
    const files = readdirSync(contactsDir).filter((f: string) => f.endsWith('.json'));

    let relevantCount = 0;
    let totalStrength = 0;

    for (const file of files) {
      try {
        const contact = JSON.parse(readFileSync(join(contactsDir, file), 'utf-8'));
        if (contact.project_relevance?.[projectId]) {
          relevantCount++;
          totalStrength += contact.project_relevance[projectId];
        }
      } catch { continue; }
    }

    // Score: min(100, relevant contacts * 10 + avg strength * 5)
    const avgStrength = relevantCount > 0 ? totalStrength / relevantCount : 0;
    return Math.min(100, relevantCount * 10 + avgStrength * 5);
  } catch {
    return 0;
  }
}

/**
 * Revenue proximity: check if project has revenue streams in vault
 */
async function computeRevenueScore(projectId: string): Promise<number> {
  try {
    const financialsPath = join(VAULT_ROOT, '10_financials/revenue-streams.json');
    if (!existsSync(financialsPath)) return 0;

    const { readFileSync } = require('fs');
    const streams = JSON.parse(readFileSync(financialsPath, 'utf-8'));

    const projectStreams = Array.isArray(streams)
      ? streams.filter((s: any) => s.project_id === projectId && s.active)
      : [];

    if (projectStreams.length === 0) return 10; // concept only
    const totalMonthly = projectStreams.reduce((s: number, r: any) => s + (r.amount_monthly || 0), 0);

    if (totalMonthly > 1000) return 90;
    if (totalMonthly > 500) return 75;
    if (totalMonthly > 100) return 60;
    if (totalMonthly > 0) return 45;
    return 20;
  } catch {
    return 10;
  }
}

/**
 * Enjoyment score: latest from enjoyment_scores table, map 1-5 to 0-100
 */
async function computeEnjoymentScore(projectId: string): Promise<number> {
  const [latest] = await db
    .select()
    .from(schema.enjoymentScores)
    .where(eq(schema.enjoymentScores.projectId, projectId))
    .orderBy(desc(schema.enjoymentScores.createdAt))
    .limit(1);

  if (!latest) return 50; // neutral
  return (latest.score - 1) * 25; // 1→0, 2→25, 3→50, 4→75, 5→100
}

// ─── Main Computation ───────────────────────────────────────────────────────

async function computeForProject(projectId: string, teamId: string) {
  // Get project to check archetype
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.teamId, teamId)))
    .limit(1);

  if (!project) throw new Error('Project not found');

  const archetype = (project as any).growthArchetype || null;
  const weights = await loadWeights(archetype);
  const thresholds = await loadThresholds();

  // Compute all component scores in parallel
  const [councilScore, experimentScore, marketScore, networkScore, revenueScore, enjoymentScore] =
    await Promise.all([
      computeCouncilScore(projectId),
      computeExperimentScore(projectId),
      computeMarketSignalScore(projectId),
      computeNetworkScore(projectId),
      computeRevenueScore(projectId),
      computeEnjoymentScore(projectId),
    ]);

  const breakdown: SignalStrengthBreakdown = {
    council_score: councilScore,
    experiment_score: experimentScore,
    market_signals: marketScore,
    network_advantage: networkScore,
    revenue_proximity: revenueScore,
    enjoyment_score: enjoymentScore,
  };

  // Weighted sum
  const score = Math.round(
    councilScore * weights.council_score +
    experimentScore * weights.experiment_score +
    marketScore * weights.market_signals +
    networkScore * weights.network_advantage +
    revenueScore * weights.revenue_proximity +
    enjoymentScore * weights.enjoyment_score
  );

  // Get previous score for trend
  const [prevRecord] = await db
    .select()
    .from(schema.signalStrengthScores)
    .where(eq(schema.signalStrengthScores.projectId, projectId))
    .orderBy(desc(schema.signalStrengthScores.computedAt))
    .limit(1);

  const previousScore = prevRecord?.score ?? null;
  let trend: SignalTrend = 'flat';
  let daysAtCurrentLevel = 0;

  if (previousScore !== null) {
    const diff = score - Number(previousScore);
    if (diff > 5) trend = 'rising';
    else if (diff < -5) trend = 'falling';
    else trend = 'flat';

    // Increment days_at_current_level if within same range
    const prevRange = getRange(Number(previousScore));
    const currRange = getRange(score);
    daysAtCurrentLevel = prevRange === currRange
      ? (prevRecord?.daysAtCurrentLevel ?? 0) + 1
      : 0;
  }

  // Apply threshold rules for recommendation
  let recommendation: KillScaleRecommendation | null = null;
  if (score <= thresholds.kill_threshold && daysAtCurrentLevel >= thresholds.kill_days_required) {
    recommendation = 'kill';
  } else if (score >= thresholds.scale_threshold) {
    recommendation = 'scale';
  } else if (score <= thresholds.park_threshold && daysAtCurrentLevel >= thresholds.park_days_required) {
    recommendation = 'park';
  } else if (score > thresholds.park_threshold && score < thresholds.scale_threshold) {
    recommendation = trend === 'rising' ? 'double_down' : 'iterate';
  }

  // Insert new score record
  const insertValues: Record<string, unknown> = {
    projectId,
    teamId,
    score: score.toString(),
    breakdown,
    trend,
    daysAtCurrentLevel,
    recommendation: recommendation ?? undefined,
  };
  if (previousScore !== null) {
    insertValues.previousScore = previousScore.toString();
  }

  const [record] = await db
    .insert(schema.signalStrengthScores)
    .values(insertValues as any)
    .returning();

  return record;
}

function getRange(score: number): string {
  if (score <= 30) return 'kill';
  if (score <= 40) return 'park';
  if (score <= 70) return 'iterate';
  return 'scale';
}

async function computeForAll(teamId: string) {
  const projects = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.teamId, teamId));

  const results = [];
  for (const project of projects) {
    try {
      const result = await computeForProject(project.id, teamId);
      results.push(result);
    } catch (err) {
      console.error(`Failed to compute signal strength for project ${project.id}:`, err);
    }
  }
  return results;
}

async function getLatest(projectId: string) {
  const [record] = await db
    .select()
    .from(schema.signalStrengthScores)
    .where(eq(schema.signalStrengthScores.projectId, projectId))
    .orderBy(desc(schema.signalStrengthScores.computedAt))
    .limit(1);

  return record ?? null;
}

async function getHistory(projectId: string, days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return db
    .select()
    .from(schema.signalStrengthScores)
    .where(
      and(
        eq(schema.signalStrengthScores.projectId, projectId),
        sql`${schema.signalStrengthScores.computedAt} >= ${cutoff.toISOString()}`
      )
    )
    .orderBy(desc(schema.signalStrengthScores.computedAt));
}

async function getPruningRecommendations(teamId: string): Promise<PortfolioPruningRecommendation[]> {
  // Get latest score per project using a subquery
  const latestScores = await db
    .select()
    .from(schema.signalStrengthScores)
    .where(eq(schema.signalStrengthScores.teamId, teamId))
    .orderBy(desc(schema.signalStrengthScores.computedAt));

  // Deduplicate: keep only latest per project
  const seen = new Set<string>();
  const uniqueScores = latestScores.filter(s => {
    if (seen.has(s.projectId)) return false;
    seen.add(s.projectId);
    return true;
  });

  // Get project names
  const projects = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(eq(schema.projects.teamId, teamId));

  const projectNames = new Map(projects.map(p => [p.id, p.name]));

  return uniqueScores
    .filter(s => s.recommendation === 'kill' || s.recommendation === 'park' || s.recommendation === 'scale')
    .map(s => ({
      project_id: s.projectId,
      project_name: projectNames.get(s.projectId) || 'Unknown',
      score: Number(s.score),
      trend: s.trend as SignalTrend,
      days_at_level: s.daysAtCurrentLevel,
      recommendation: s.recommendation as KillScaleRecommendation,
      rationale: generateRationale(s),
      breakdown: s.breakdown as SignalStrengthBreakdown,
    }));
}

function generateRationale(s: any): string {
  const score = Number(s.score);
  const breakdown = s.breakdown as SignalStrengthBreakdown;

  if (s.recommendation === 'kill') {
    const weakest = Object.entries(breakdown).sort(([, a], [, b]) => (a as number) - (b as number));
    return `Score ${score}/100 for ${s.daysAtCurrentLevel} days. Weakest: ${weakest[0][0]} (${weakest[0][1]}).`;
  }
  if (s.recommendation === 'scale') {
    const strongest = Object.entries(breakdown).sort(([, a], [, b]) => (b as number) - (a as number));
    return `Score ${score}/100 trending ${s.trend}. Strongest: ${strongest[0][0]} (${strongest[0][1]}).`;
  }
  return `Score ${score}/100 for ${s.daysAtCurrentLevel} days. Consider parking while focusing on stronger projects.`;
}

async function getOverview(teamId: string): Promise<ValidationEngineOverview> {
  const projects = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.teamId, teamId));

  const latestScores = await db
    .select()
    .from(schema.signalStrengthScores)
    .where(eq(schema.signalStrengthScores.teamId, teamId))
    .orderBy(desc(schema.signalStrengthScores.computedAt));

  const seen = new Set<string>();
  const uniqueScores = latestScores.filter(s => {
    if (seen.has(s.projectId)) return false;
    seen.add(s.projectId);
    return true;
  });

  const scores = uniqueScores.map(s => Number(s.score));
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    total_projects: projects.length,
    scored_projects: uniqueScores.length,
    kill_candidates: uniqueScores.filter(s => s.recommendation === 'kill').length,
    scale_candidates: uniqueScores.filter(s => s.recommendation === 'scale').length,
    park_candidates: uniqueScores.filter(s => s.recommendation === 'park').length,
    average_score: Math.round(avgScore * 10) / 10,
    score_distribution: [
      { range: '0-20', count: scores.filter(s => s <= 20).length },
      { range: '21-40', count: scores.filter(s => s > 20 && s <= 40).length },
      { range: '41-60', count: scores.filter(s => s > 40 && s <= 60).length },
      { range: '61-80', count: scores.filter(s => s > 60 && s <= 80).length },
      { range: '81-100', count: scores.filter(s => s > 80).length },
    ],
    last_computed_at: uniqueScores.length > 0
      ? (uniqueScores[0].computedAt as Date).toISOString()
      : null,
  };
}

export const signalStrengthService = {
  computeForProject,
  computeForAll,
  getLatest,
  getHistory,
  getPruningRecommendations,
  getOverview,
  loadWeights,
  loadThresholds,
};
