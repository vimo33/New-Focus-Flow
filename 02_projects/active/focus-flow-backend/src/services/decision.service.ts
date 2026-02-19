/**
 * Decision Service - Database-backed decision management
 *
 * This is separate from the existing decision-log.service.ts which handles
 * file-based decisions in the vault. Both coexist during migration.
 * This service operates on the `decisions` table via Drizzle ORM.
 */

import { db } from '../db/connection';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

type DecisionAction = 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';

interface CreateDecisionData {
  experimentId?: string;
  action: DecisionAction;
  rationale: string;
  evidence: string[];
  assumptions: string[];
  confidence: number;
  counterarguments: string[];
  createdBy?: string;
}

/**
 * Create a new decision record for a project.
 */
async function create(projectId: string, data: CreateDecisionData) {
  const [decision] = await db
    .insert(schema.decisions)
    .values({
      projectId,
      experimentId: data.experimentId ?? undefined,
      action: data.action,
      rationale: data.rationale,
      evidenceJson: data.evidence,
      assumptionsJson: data.assumptions,
      confidence: data.confidence,
      counterargumentsJson: data.counterarguments,
      createdBy: data.createdBy ?? undefined,
    })
    .returning();

  return decision;
}

/**
 * List decisions, optionally filtered by project. Ordered by creation date descending.
 */
async function list(projectId?: string) {
  if (projectId) {
    return db
      .select()
      .from(schema.decisions)
      .where(eq(schema.decisions.projectId, projectId))
      .orderBy(desc(schema.decisions.createdAt));
  }

  return db
    .select()
    .from(schema.decisions)
    .orderBy(desc(schema.decisions.createdAt));
}

/**
 * Get a single decision by ID.
 */
async function getById(id: string) {
  const [decision] = await db
    .select()
    .from(schema.decisions)
    .where(eq(schema.decisions.id, id))
    .limit(1);

  return decision ?? null;
}

export const decisionService = {
  create,
  list,
  getById,
};
