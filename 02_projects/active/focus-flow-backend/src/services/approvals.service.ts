/**
 * Approvals Service - Approval queue for agent actions (route-compatible)
 *
 * Manages the human-in-the-loop approval flow: agents create pending approvals,
 * human operators approve or reject them. Methods accept teamId for authorization scoping.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

type RiskTier = 'tier1' | 'tier2' | 'tier3';
type ApprovalDecisionStatus = 'approved' | 'rejected';

interface CreateApprovalData {
  agentRunId?: string;
  actionSummary: string;
  riskTier: RiskTier;
  evidence?: string;
}

interface DecideInput {
  status: ApprovalDecisionStatus;
  decidedBy: string;
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

  await audit(teamId, null, null, 'approval.create', 'approval', approval.id, {
    riskTier: data.riskTier,
  });

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
 * Approve or reject an approval, with team-scoped access check.
 */
async function decide(id: string, teamId: string, input: DecideInput) {
  // Verify the approval belongs to the team
  const [existing] = await db
    .select()
    .from(schema.approvals)
    .where(and(eq(schema.approvals.id, id), eq(schema.approvals.teamId, teamId)))
    .limit(1);

  if (!existing) return null;

  const [updated] = await db
    .update(schema.approvals)
    .set({
      status: input.status,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
    })
    .where(eq(schema.approvals.id, id))
    .returning();

  if (updated) {
    await audit(teamId, input.decidedBy, null, `approval.${input.status}`, 'approval', id, {
      previousStatus: existing.status,
    });
  }

  return updated ?? null;
}

/**
 * Get a single approval by ID, with team-scoped access check.
 */
async function getById(id: string, teamId: string) {
  const [approval] = await db
    .select()
    .from(schema.approvals)
    .where(and(eq(schema.approvals.id, id), eq(schema.approvals.teamId, teamId)))
    .limit(1);

  return approval ?? null;
}

export const approvalsService = {
  create,
  listPending,
  decide,
  getById,
};
