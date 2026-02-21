/**
 * Validation Sprint Service — Groups experiments into time-boxed sprints.
 * Run 3-5 cheap experiments simultaneously, rank results, kill losers.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';
import { signalStrengthService } from './signal-strength.service';

interface CreateSprintInput {
  teamId: string;
  name: string;
  totalBudgetUsd?: number;
  durationDays?: number;
}

async function create(input: CreateSprintInput) {
  const [sprint] = await db
    .insert(schema.validationSprints)
    .values({
      teamId: input.teamId,
      name: input.name,
      totalBudgetUsd: input.totalBudgetUsd,
    } as any)
    .returning();

  await audit(input.teamId, null, null, 'sprint.create', 'validation_sprint', sprint.id, {
    name: input.name,
  });

  return sprint;
}

async function addExperiment(sprintId: string, experimentId: string, budget?: number) {
  const [link] = await db
    .insert(schema.sprintExperiments)
    .values({
      sprintId,
      experimentId,
      budgetAllocation: budget,
    } as any)
    .returning();

  return link;
}

async function start(sprintId: string, teamId: string) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 14);

  const [updated] = await db
    .update(schema.validationSprints)
    .set({
      status: 'active',
      startDate: now,
      endDate: endDate,
    })
    .where(eq(schema.validationSprints.id, sprintId))
    .returning();

  // Move linked experiments to running
  const links = await db
    .select()
    .from(schema.sprintExperiments)
    .where(eq(schema.sprintExperiments.sprintId, sprintId));

  for (const link of links) {
    await db
      .update(schema.experiments)
      .set({ status: 'running', startAt: now })
      .where(eq(schema.experiments.id, link.experimentId));
  }

  await audit(teamId, null, null, 'sprint.start', 'validation_sprint', sprintId, {
    experimentCount: links.length,
  });

  return updated;
}

async function complete(sprintId: string, teamId: string) {
  // Get sprint experiments
  const links = await db
    .select()
    .from(schema.sprintExperiments)
    .where(eq(schema.sprintExperiments.sprintId, sprintId));

  const rankings = [];
  let totalSpent = 0;

  for (const link of links) {
    const [experiment] = await db
      .select()
      .from(schema.experiments)
      .where(eq(schema.experiments.id, link.experimentId))
      .limit(1);

    if (!experiment) continue;

    // Get pre-sprint score (most recent before sprint start)
    const preScore = await signalStrengthService.getLatest(experiment.projectId);
    const preScoreVal = preScore ? Number(preScore.score) : 50;

    // Recompute post-sprint score
    const postScore = await signalStrengthService.computeForProject(experiment.projectId, teamId);
    const postScoreVal = Number(postScore.score);

    rankings.push({
      project_id: experiment.projectId,
      experiment_id: experiment.id,
      pre_sprint_score: preScoreVal,
      post_sprint_score: postScoreVal,
      delta: postScoreVal - preScoreVal,
      recommendation: postScoreVal >= 70 ? 'scale' : postScoreVal <= 30 ? 'kill' : 'iterate',
    });

    totalSpent += Number(link.budgetAllocation) || 0;
  }

  // Sort by delta descending
  rankings.sort((a, b) => b.delta - a.delta);

  // Assign ranks
  rankings.forEach((r, i) => { (r as any).rank = i + 1; });

  const results = {
    rankings,
    total_spent_usd: totalSpent,
    key_learnings: [] as string[],
    patterns_extracted: [] as string[],
  };

  const [updated] = await db
    .update(schema.validationSprints)
    .set({
      status: 'completed',
      results,
    })
    .where(eq(schema.validationSprints.id, sprintId))
    .returning();

  // Update experiment ranks
  for (const ranking of rankings) {
    await db
      .update(schema.sprintExperiments)
      .set({ rank: (ranking as any).rank })
      .where(
        and(
          eq(schema.sprintExperiments.sprintId, sprintId),
          eq(schema.sprintExperiments.experimentId, ranking.experiment_id)
        )
      );
  }

  await audit(teamId, null, null, 'sprint.complete', 'validation_sprint', sprintId, {
    rankings: rankings.length,
  });

  return updated;
}

async function getById(sprintId: string) {
  const [sprint] = await db
    .select()
    .from(schema.validationSprints)
    .where(eq(schema.validationSprints.id, sprintId))
    .limit(1);

  if (!sprint) return null;

  const experiments = await db
    .select()
    .from(schema.sprintExperiments)
    .where(eq(schema.sprintExperiments.sprintId, sprintId));

  return { ...sprint, experiments };
}

async function getActive(teamId: string) {
  return db
    .select()
    .from(schema.validationSprints)
    .where(
      and(
        eq(schema.validationSprints.teamId, teamId),
        eq(schema.validationSprints.status, 'active')
      )
    )
    .orderBy(desc(schema.validationSprints.createdAt));
}

async function getAll(teamId: string) {
  return db
    .select()
    .from(schema.validationSprints)
    .where(eq(schema.validationSprints.teamId, teamId))
    .orderBy(desc(schema.validationSprints.createdAt));
}

export const validationSprintService = {
  create,
  addExperiment,
  start,
  complete,
  getById,
  getActive,
  getAll,
};
