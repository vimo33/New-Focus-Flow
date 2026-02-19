/**
 * Hypotheses Service - CRUD for hypotheses within a project (route-compatible)
 *
 * Manages hypothesis lifecycle: creation, listing, confidence updates,
 * and evidence tracking. Methods accept teamId for authorization scoping.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

type HypothesisType = 'problem' | 'solution' | 'channel' | 'pricing' | 'moat';

interface CreateHypothesisInput {
  projectId: string;
  teamId: string;
  statement: string;
  type: HypothesisType;
  confidence?: number;
  evidenceRefs?: string[];
  createdBy?: string;
}

interface UpdateConfidenceInput {
  confidence: number;
  newEvidence?: string[];
  updatedBy?: string;
}

/**
 * Verify a project belongs to a team.
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
 * Verify a hypothesis belongs to a team (via its project).
 */
async function verifyHypothesisTeam(hypothesisId: string, teamId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.hypotheses.id })
    .from(schema.hypotheses)
    .innerJoin(schema.projects, eq(schema.hypotheses.projectId, schema.projects.id))
    .where(and(eq(schema.hypotheses.id, hypothesisId), eq(schema.projects.teamId, teamId)))
    .limit(1);
  return !!row;
}

/**
 * Create a new hypothesis for a project.
 */
async function create(input: CreateHypothesisInput) {
  const ok = await verifyProjectTeam(input.projectId, input.teamId);
  if (!ok) {
    throw new Error('Project not found or access denied');
  }

  const [hypothesis] = await db
    .insert(schema.hypotheses)
    .values({
      projectId: input.projectId,
      statement: input.statement,
      type: input.type,
      confidence: input.confidence ?? undefined,
      evidenceRefsJson: input.evidenceRefs ?? [],
      ownerAgent: undefined,
    })
    .returning();

  await audit(input.teamId, input.createdBy ?? null, null, 'hypothesis.create', 'hypothesis', hypothesis.id, {
    projectId: input.projectId,
    type: input.type,
  });

  return hypothesis;
}

/**
 * List all hypotheses for a project, with team-scoped access check.
 * Ordered by confidence descending.
 */
async function listByProject(projectId: string, teamId: string) {
  const ok = await verifyProjectTeam(projectId, teamId);
  if (!ok) {
    throw new Error('Project not found or access denied');
  }

  return db
    .select()
    .from(schema.hypotheses)
    .where(eq(schema.hypotheses.projectId, projectId))
    .orderBy(desc(schema.hypotheses.confidence));
}

/**
 * Get a single hypothesis by ID, with team-scoped access check.
 */
async function getById(id: string, teamId: string) {
  const ok = await verifyHypothesisTeam(id, teamId);
  if (!ok) return null;

  const [hypothesis] = await db
    .select()
    .from(schema.hypotheses)
    .where(eq(schema.hypotheses.id, id))
    .limit(1);

  return hypothesis ?? null;
}

/**
 * Update confidence score and optionally append new evidence references.
 */
async function updateConfidence(id: string, teamId: string, input: UpdateConfidenceInput) {
  const ok = await verifyHypothesisTeam(id, teamId);
  if (!ok) return null;

  // If new evidence is provided, merge with existing
  if (input.newEvidence && input.newEvidence.length > 0) {
    const [existing] = await db
      .select()
      .from(schema.hypotheses)
      .where(eq(schema.hypotheses.id, id))
      .limit(1);

    if (!existing) return null;

    const mergedEvidence = [
      ...(existing.evidenceRefsJson ?? []),
      ...input.newEvidence,
    ];

    const [updated] = await db
      .update(schema.hypotheses)
      .set({
        confidence: input.confidence,
        evidenceRefsJson: mergedEvidence,
      })
      .where(eq(schema.hypotheses.id, id))
      .returning();

    if (updated) {
      await audit(teamId, input.updatedBy ?? null, null, 'hypothesis.updateConfidence', 'hypothesis', id, {
        confidence: input.confidence,
        newEvidenceCount: input.newEvidence.length,
      });
    }

    return updated ?? null;
  }

  const [updated] = await db
    .update(schema.hypotheses)
    .set({ confidence: input.confidence })
    .where(eq(schema.hypotheses.id, id))
    .returning();

  if (updated) {
    await audit(teamId, input.updatedBy ?? null, null, 'hypothesis.updateConfidence', 'hypothesis', id, {
      confidence: input.confidence,
    });
  }

  return updated ?? null;
}

export const hypothesesService = {
  create,
  listByProject,
  getById,
  updateConfidence,
};
