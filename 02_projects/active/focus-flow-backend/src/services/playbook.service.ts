/**
 * Playbook Service - CRUD for playbooks scoped to a team
 *
 * Playbooks capture repeatable strategies derived from experiments.
 * Each playbook contains ordered steps, success metrics, and failure modes.
 */

import { db } from '../db/connection';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

interface PlaybookStep {
  order: number;
  action: string;
  details: string;
}

interface CreatePlaybookData {
  projectId?: string;
  title: string;
  context?: string;
  steps: PlaybookStep[];
  successMetrics: string[];
  failureModes: string[];
  sourceExperimentId?: string;
}

/**
 * Create a new playbook for a team.
 */
async function create(teamId: string, data: CreatePlaybookData) {
  const [playbook] = await db
    .insert(schema.playbooks)
    .values({
      teamId,
      projectId: data.projectId ?? undefined,
      title: data.title,
      context: data.context ?? undefined,
      stepsJson: data.steps,
      successMetricsJson: data.successMetrics,
      failureModesJson: data.failureModes,
      sourceExperimentId: data.sourceExperimentId ?? undefined,
    })
    .returning();

  return playbook;
}

/**
 * List all playbooks for a team, ordered by creation date descending.
 */
async function list(teamId: string) {
  return db
    .select()
    .from(schema.playbooks)
    .where(eq(schema.playbooks.teamId, teamId))
    .orderBy(desc(schema.playbooks.createdAt));
}

/**
 * Get a single playbook by ID.
 */
async function getById(id: string) {
  const [playbook] = await db
    .select()
    .from(schema.playbooks)
    .where(eq(schema.playbooks.id, id))
    .limit(1);

  return playbook ?? null;
}

export const playbookService = {
  create,
  list,
  getById,
};
