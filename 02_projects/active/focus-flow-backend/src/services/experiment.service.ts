/**
 * Experiment Service - CRUD for experiments within a project
 *
 * Manages experiment lifecycle: creation, status updates, results recording,
 * and decision capture.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
type DecisionAction = 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';

interface CreateExperimentData {
  hypothesisId?: string;
  metricName: string;
  metricDefinition?: string;
  successRule: string;
}

interface ExperimentResults {
  baseline: number;
  variant: number;
  lift?: number;
  p_value?: number;
  sample_size?: number;
}

/**
 * Create a new experiment for a project.
 */
async function create(projectId: string, data: CreateExperimentData) {
  const [experiment] = await db
    .insert(schema.experiments)
    .values({
      projectId,
      hypothesisId: data.hypothesisId ?? undefined,
      metricName: data.metricName,
      metricDefinition: data.metricDefinition ?? undefined,
      successRule: data.successRule,
    })
    .returning();

  return experiment;
}

/**
 * List experiments for a project, optionally filtered by status.
 */
async function list(projectId: string, filters?: { status?: ExperimentStatus }) {
  const conditions = [eq(schema.experiments.projectId, projectId)];

  if (filters?.status) {
    conditions.push(eq(schema.experiments.status, filters.status));
  }

  return db
    .select()
    .from(schema.experiments)
    .where(and(...conditions))
    .orderBy(desc(schema.experiments.createdAt));
}

/**
 * Get a single experiment by ID.
 */
async function getById(id: string) {
  const [experiment] = await db
    .select()
    .from(schema.experiments)
    .where(eq(schema.experiments.id, id))
    .limit(1);

  return experiment ?? null;
}

/**
 * Update the results JSON for an experiment.
 */
async function updateResults(id: string, results: ExperimentResults) {
  const [updated] = await db
    .update(schema.experiments)
    .set({
      resultsJson: {
        baseline: results.baseline,
        variant: results.variant,
        lift: results.lift,
        p_value: results.p_value,
        sample_size: results.sample_size,
      },
    })
    .where(eq(schema.experiments.id, id))
    .returning();

  return updated ?? null;
}

/**
 * Update experiment status.
 */
async function updateStatus(id: string, status: ExperimentStatus) {
  const setValues: Record<string, unknown> = { status };

  // Auto-set startAt/endAt timestamps based on status transitions
  if (status === 'running') {
    setValues.startAt = new Date();
  } else if (status === 'completed') {
    setValues.endAt = new Date();
  }

  const [updated] = await db
    .update(schema.experiments)
    .set(setValues)
    .where(eq(schema.experiments.id, id))
    .returning();

  return updated ?? null;
}

/**
 * Record a decision and rationale for an experiment.
 */
async function recordDecision(id: string, decision: DecisionAction, rationale: string) {
  const [updated] = await db
    .update(schema.experiments)
    .set({
      decision,
      decisionRationale: rationale,
    })
    .where(eq(schema.experiments.id, id))
    .returning();

  return updated ?? null;
}

export const experimentService = {
  create,
  list,
  getById,
  updateResults,
  updateStatus,
  recordDecision,
};
