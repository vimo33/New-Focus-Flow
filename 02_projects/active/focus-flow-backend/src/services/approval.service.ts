/**
 * Approval Service - Approval queue for agent actions
 *
 * Manages the human-in-the-loop approval flow: agents create pending approvals,
 * human operators approve or reject them.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

type RiskTier = 'tier1' | 'tier2' | 'tier3';
type ApprovalDecisionStatus = 'approved' | 'rejected';

interface CreateApprovalData {
  agentRunId?: string;
  actionSummary: string;
  riskTier: RiskTier;
  evidence?: string;
}

/**
 * Create a new pending approval for a team.
 */
async function create(teamId: string, data: CreateApprovalData) {
  const [approval] = await db
    .insert(schema.approvals)
    .values({
      teamId,
      agentRunId: data.agentRunId ?? undefined,
      actionSummary: data.actionSummary,
      riskTier: data.riskTier,
      evidence: data.evidence ?? undefined,
    })
    .returning();

  return approval;
}

/**
 * List all pending approvals for a team, ordered by creation date descending.
 */
async function listPending(teamId: string) {
  return db
    .select()
    .from(schema.approvals)
    .where(
      and(
        eq(schema.approvals.teamId, teamId),
        eq(schema.approvals.status, 'pending')
      )
    )
    .orderBy(desc(schema.approvals.createdAt));
}

/**
 * Approve or reject an approval. Sets decidedBy, decidedAt, and status.
 */
async function decide(id: string, userId: string, status: ApprovalDecisionStatus) {
  const [updated] = await db
    .update(schema.approvals)
    .set({
      status,
      decidedBy: userId,
      decidedAt: new Date(),
    })
    .where(eq(schema.approvals.id, id))
    .returning();

  return updated ?? null;
}

/**
 * Get a single approval by ID.
 */
async function getById(id: string) {
  const [approval] = await db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.id, id))
    .limit(1);

  return approval ?? null;
}

export const approvalService = {
  create,
  listPending,
  decide,
  getById,
};
