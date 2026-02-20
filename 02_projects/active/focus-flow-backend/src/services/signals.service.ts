/**
 * Signals Service - CRUD for signals table
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

interface CreateSignalData {
  projectId: string;
  experimentId?: string;
  type: string;
  valueJson?: unknown;
  source?: string;
}

async function list(projectId?: string) {
  if (projectId) {
    return db
      .select()
      .from(schema.signals)
      .where(eq(schema.signals.projectId, projectId))
      .orderBy(desc(schema.signals.createdAt));
  }
  return db
    .select()
    .from(schema.signals)
    .orderBy(desc(schema.signals.createdAt))
    .limit(100);
}

async function create(data: CreateSignalData) {
  const [signal] = await db
    .insert(schema.signals)
    .values({
      projectId: data.projectId,
      experimentId: data.experimentId ?? undefined,
      type: data.type,
      valueJson: data.valueJson ?? undefined,
      source: data.source ?? 'manual',
    })
    .returning();

  return signal;
}

async function getById(id: string) {
  const [signal] = await db
    .select()
    .from(schema.signals)
    .where(eq(schema.signals.id, id))
    .limit(1);

  return signal ?? null;
}

export const signalsService = {
  list,
  create,
  getById,
};
