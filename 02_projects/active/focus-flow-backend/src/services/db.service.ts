/**
 * Database Service - Thin query layer wrapping common database operations
 *
 * Provides access to the Drizzle db instance, team-scoped filtering,
 * and audit log insertion.
 */

import { db } from '../db/connection';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Returns the shared Drizzle database instance.
 */
export function getDb() {
  return db;
}

/**
 * Returns an `eq` condition for row-level team filtering.
 * Usage: `db.select().from(schema.projects).where(withTeamFilter(teamId))`
 * where the table has a `teamId` column.
 *
 * The caller must pass the correct table's teamId column reference,
 * but this helper defaults to the most common pattern (projects.teamId).
 */
export function withTeamFilter<T extends { teamId: ReturnType<typeof schema.projects.teamId.mapFromDriverValue> }>(
  teamId: string,
  table: { teamId: any } = schema.projects
) {
  return eq(table.teamId, teamId);
}

/**
 * Inserts a row into the audit_log table for traceability.
 */
export async function audit(
  teamId: string | null,
  userId: string | null,
  agentName: string | null,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await db.insert(schema.auditLog).values({
    teamId: teamId ?? undefined,
    userId: userId ?? undefined,
    agentName: agentName ?? undefined,
    action,
    resourceType: resourceType ?? undefined,
    resourceId: resourceId ?? undefined,
    detailsJson: details ?? undefined,
  });
}

export const dbService = {
  getDb,
  withTeamFilter,
  audit,
};
