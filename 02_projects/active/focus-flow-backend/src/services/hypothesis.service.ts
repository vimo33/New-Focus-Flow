/**
 * Hypothesis Service - CRUD for hypotheses within a project
 *
 * Manages hypothesis lifecycle: creation, listing, confidence updates,
 * and evidence tracking.
 */

import { db } from '../db/connection';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

type HypothesisType = 'problem' | 'solution' | 'channel' | 'pricing' | 'moat';

interface CreateHypothesisData {
  statement: string;
  type: HypothesisType;
  confidence?: number;
  evidenceRefs?: string[];
  ownerAgent?: string;
}

/**
 * Create a new hypothesis for a project.
 */
async function create(projectId: string, data: CreateHypothesisData) {
  const [hypothesis] = await db
    .insert(schema.hypotheses)
    .values({
      projectId,
      statement: data.statement,
      type: data.type,
      confidence: data.confidence ?? undefined,
      evidenceRefsJson: data.evidenceRefs ?? [],
      ownerAgent: data.ownerAgent ?? undefined,
    })
    .returning();

  return hypothesis;
}

/**
 * List all hypotheses for a project, ordered by confidence descending.
 */
async function list(projectId: string) {
  return db
    .select()
    .from(schema.hypotheses)
    .where(eq(schema.hypotheses.projectId, projectId))
    .orderBy(desc(schema.hypotheses.confidence));
}

/**
 * Get a single hypothesis by ID.
 */
async function getById(id: string) {
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
async function updateConfidence(id: string, confidence: number, newEvidence?: string[]) {
  // If new evidence is provided, we need to merge with existing
  if (newEvidence && newEvidence.length > 0) {
    const existing = await getById(id);
    if (!existing) return null;

    const mergedEvidence = [
      ...(existing.evidenceRefsJson ?? []),
      ...newEvidence,
    ];

    const [updated] = await db
      .update(schema.hypotheses)
      .set({
        confidence,
        evidenceRefsJson: mergedEvidence,
      })
      .where(eq(schema.hypotheses.id, id))
      .returning();

    return updated ?? null;
  }

  const [updated] = await db
    .update(schema.hypotheses)
    .set({ confidence })
    .where(eq(schema.hypotheses.id, id))
    .returning();

  return updated ?? null;
}

export const hypothesisService = {
  create,
  list,
  getById,
  updateConfidence,
};
