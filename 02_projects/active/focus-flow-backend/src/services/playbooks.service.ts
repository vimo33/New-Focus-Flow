/**
 * Playbooks Service - CRUD for playbooks scoped to a team (route-compatible)
 *
 * Playbooks capture repeatable strategies derived from experiments.
 * Each playbook contains ordered steps, success metrics, and failure modes.
 * Methods accept teamId for authorization scoping.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

interface PlaybookStep {
  order: number;
  action: string;
  details: string;
}

interface CreatePlaybookInput {
  projectId?: string;
  title: string;
  context?: string;
  steps: PlaybookStep[];
  successMetrics?: string[];
  failureModes?: string[];
  sourceExperimentId?: string;
  teamId: string;
  createdBy?: string;
}

/**
 * Create a new playbook for a team.
 */
async function create(input: CreatePlaybookInput) {
  const [playbook] = await db
    .insert(schema.playbooks)
    .values({
      teamId: input.teamId,
      projectId: input.projectId ?? undefined,
      title: input.title,
      context: input.context ?? undefined,
      stepsJson: input.steps,
      successMetricsJson: input.successMetrics ?? [],
      failureModesJson: input.failureModes ?? [],
      sourceExperimentId: input.sourceExperimentId ?? undefined,
    })
    .returning();

  await audit(input.teamId, input.createdBy ?? null, null, 'playbook.create', 'playbook', playbook.id, {
    title: input.title,
  });

  return playbook;
}

/**
 * List all playbooks for a team, ordered by creation date descending.
 */
async function listByTeam(teamId: string) {
  return db
    .select()
    .from(schema.playbooks)
    .where(eq(schema.playbooks.teamId, teamId))
    .orderBy(desc(schema.playbooks.createdAt));
}

/**
 * Get a single playbook by ID, with team-scoped access check.
 */
async function getById(id: string, teamId: string) {
  const [playbook] = await db
    .select()
    .from(schema.playbooks)
    .where(and(eq(schema.playbooks.id, id), eq(schema.playbooks.teamId, teamId)))
    .limit(1);

  return playbook ?? null;
}

export const playbooksService = {
  create,
  listByTeam,
  getById,
};
