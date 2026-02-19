/**
 * Experiments Service - CRUD for experiments within a project (route-compatible)
 *
 * Manages experiment lifecycle: creation, status updates, results recording,
 * and decision capture. Methods accept teamId for authorization scoping.
 *
 * Re-exports from experiment.service.ts core logic and adds team-scoped variants.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
type DecisionAction = 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';

interface CreateExperimentInput {
  projectId: string;
  teamId: string;
  hypothesisId?: string;
  metricName: string;
  metricDefinition?: string;
  successRule: string;
  createdBy?: string;
}

interface RecordResultsInput {
  baseline: number;
  variant: number;
  lift?: number;
  p_value?: number;
  sample_size?: number;
  updatedBy?: string;
}

interface UpdateStatusInput {
  status: ExperimentStatus;
  updatedBy?: string;
}

interface RecordDecisionInput {
  decision: DecisionAction;
  rationale: string;
  decidedBy?: string;
}

/**
 * Verify a project belongs to a team. Returns true if the project exists and matches teamId.
 */
async function verifyProjectTeam(projectId: string, teamId: string): Promise<boolean> {
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.teamId, teamId)))
    .limit(1);
  return !!project;
}

/**
 * Verify an experiment belongs to a team (via its project).
 */
async function verifyExperimentTeam(experimentId: string, teamId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.experiments.id })
    .from(schema.experiments)
    .innerJoin(schema.projects, eq(schema.experiments.projectId, schema.projects.id))
    .where(and(eq(schema.experiments.id, experimentId), eq(schema.projects.teamId, teamId)))
    .limit(1);
  return !!row;
}

/**
 * Create a new experiment.
 */
async function create(input: CreateExperimentInput) {
  const ok = await verifyProjectTeam(input.projectId, input.teamId);
  if (!ok) {
    throw new Error('Project not found or access denied');
  }

  const [experiment] = await db
    .insert(schema.experiments)
    .values({
      projectId: input.projectId,
      hypothesisId: input.hypothesisId ?? undefined,
      metricName: input.metricName,
      metricDefinition: input.metricDefinition ?? undefined,
      successRule: input.successRule,
    })
    .returning();

  await audit(input.teamId, input.createdBy ?? null, null, 'experiment.create', 'experiment', experiment.id, {
    projectId: input.projectId,
  });

  return experiment;
}

/**
 * List experiments for a project, with team-scoped access check.
 */
async function listByProject(projectId: string, teamId: string, status?: string) {
  const ok = await verifyProjectTeam(projectId, teamId);
  if (!ok) {
    throw new Error('Project not found or access denied');
  }

  const conditions = [eq(schema.experiments.projectId, projectId)];

  if (status) {
    conditions.push(eq(schema.experiments.status, status as ExperimentStatus));
  }

  return db
    .select()
    .from(schema.experiments)
    .where(and(...conditions))
    .orderBy(desc(schema.experiments.createdAt));
}

/**
 * Get a single experiment by ID, with team-scoped access check.
 */
async function getById(id: string, teamId: string) {
  const ok = await verifyExperimentTeam(id, teamId);
  if (!ok) return null;

  const [experiment] = await db
    .select()
    .from(schema.experiments)
    .where(eq(schema.experiments.id, id))
    .limit(1);

  return experiment ?? null;
}

/**
 * Record experiment results.
 */
async function recordResults(id: string, teamId: string, input: RecordResultsInput) {
  const ok = await verifyExperimentTeam(id, teamId);
  if (!ok) return null;

  const [updated] = await db
    .update(schema.experiments)
    .set({
      resultsJson: {
        baseline: input.baseline,
        variant: input.variant,
        lift: input.lift,
        p_value: input.p_value,
        sample_size: input.sample_size,
      },
    })
    .where(eq(schema.experiments.id, id))
    .returning();

  if (updated) {
    await audit(teamId, input.updatedBy ?? null, null, 'experiment.recordResults', 'experiment', id, {
      baseline: input.baseline,
      variant: input.variant,
    });
  }

  return updated ?? null;
}

/**
 * Update experiment status.
 */
async function updateStatus(id: string, teamId: string, input: UpdateStatusInput) {
  const ok = await verifyExperimentTeam(id, teamId);
  if (!ok) return null;

  const setValues: Record<string, unknown> = { status: input.status };

  if (input.status === 'running') {
    setValues.startAt = new Date();
  } else if (input.status === 'completed') {
    setValues.endAt = new Date();
  }

  const [updated] = await db
    .update(schema.experiments)
    .set(setValues)
    .where(eq(schema.experiments.id, id))
    .returning();

  if (updated) {
    await audit(teamId, input.updatedBy ?? null, null, 'experiment.updateStatus', 'experiment', id, {
      status: input.status,
    });
  }

  return updated ?? null;
}

/**
 * Record a decision on an experiment.
 */
async function recordDecision(id: string, teamId: string, input: RecordDecisionInput) {
  const ok = await verifyExperimentTeam(id, teamId);
  if (!ok) return null;

  const [updated] = await db
    .update(schema.experiments)
    .set({
      decision: input.decision,
      decisionRationale: input.rationale,
    })
    .where(eq(schema.experiments.id, id))
    .returning();

  if (updated) {
    await audit(teamId, input.decidedBy ?? null, null, 'experiment.recordDecision', 'experiment', id, {
      decision: input.decision,
    });
  }

  return updated ?? null;
}

export const experimentsService = {
  create,
  listByProject,
  getById,
  recordResults,
  updateStatus,
  recordDecision,
};
