/**
 * Agent Runs Service - Query PG agent_runs table
 */

import { db } from '../db/connection';
import { eq, desc, sql, and } from 'drizzle-orm';
import * as schema from '../db/schema';

type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type RunMode = 'think' | 'validate' | 'build' | 'grow' | 'leverage';

interface ListFilters {
  status?: RunStatus;
  mode?: RunMode;
  limit?: number;
}

async function list(filters?: ListFilters) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(schema.agentRuns.status, filters.status));
  }
  if (filters?.mode) {
    conditions.push(eq(schema.agentRuns.mode, filters.mode));
  }

  const query = db
    .select()
    .from(schema.agentRuns)
    .orderBy(desc(schema.agentRuns.createdAt))
    .limit(filters?.limit ?? 50);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

async function getById(id: string) {
  const [run] = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.id, id))
    .limit(1);

  return run ?? null;
}

async function getStats() {
  const rows = await db
    .select({
      status: schema.agentRuns.status,
      count: sql<number>`count(*)::int`,
      totalCost: sql<number>`coalesce(sum(${schema.agentRuns.costUsd}), 0)::numeric(10,4)`,
    })
    .from(schema.agentRuns)
    .groupBy(schema.agentRuns.status);

  const byStatus: Record<string, { count: number; cost: number }> = {};
  let totalRuns = 0;
  let totalCost = 0;

  for (const row of rows) {
    byStatus[row.status] = {
      count: row.count,
      cost: Number(row.totalCost),
    };
    totalRuns += row.count;
    totalCost += Number(row.totalCost);
  }

  // Cost breakdown by mode
  const byMode = await db
    .select({
      mode: schema.agentRuns.mode,
      count: sql<number>`count(*)::int`,
      totalCost: sql<number>`coalesce(sum(${schema.agentRuns.costUsd}), 0)::numeric(10,4)`,
    })
    .from(schema.agentRuns)
    .groupBy(schema.agentRuns.mode);

  return {
    total_runs: totalRuns,
    total_cost: Math.round(totalCost * 100) / 100,
    by_status: byStatus,
    by_mode: byMode.map(r => ({
      mode: r.mode,
      count: r.count,
      cost: Number(r.totalCost),
    })),
  };
}

export const agentRunsService = {
  list,
  getById,
  getStats,
};
