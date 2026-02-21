/**
 * Enjoyment Service — Simple CRUD for founder enjoyment scores per project.
 * 1-5 scale with optional notes. Used as a component in Signal Strength Score.
 */

import { db } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

interface RecordEnjoymentInput {
  projectId: string;
  teamId: string;
  score: number;
  note?: string;
  createdBy?: string;
}

async function record(input: RecordEnjoymentInput) {
  if (input.score < 1 || input.score > 5) {
    throw new Error('Enjoyment score must be between 1 and 5');
  }

  const [entry] = await db
    .insert(schema.enjoymentScores)
    .values({
      projectId: input.projectId,
      teamId: input.teamId,
      score: input.score,
      note: input.note ?? null,
      createdBy: input.createdBy ?? undefined,
    })
    .returning();

  await audit(input.teamId, input.createdBy ?? null, null, 'enjoyment.record', 'enjoyment', entry.id, {
    projectId: input.projectId,
    score: input.score,
  });

  return entry;
}

async function getLatest(projectId: string, teamId: string) {
  const [latest] = await db
    .select()
    .from(schema.enjoymentScores)
    .where(
      and(
        eq(schema.enjoymentScores.projectId, projectId),
        eq(schema.enjoymentScores.teamId, teamId),
      )
    )
    .orderBy(desc(schema.enjoymentScores.createdAt))
    .limit(1);

  return latest ?? null;
}

async function getHistory(projectId: string, teamId: string, limit: number = 20) {
  return db
    .select()
    .from(schema.enjoymentScores)
    .where(
      and(
        eq(schema.enjoymentScores.projectId, projectId),
        eq(schema.enjoymentScores.teamId, teamId),
      )
    )
    .orderBy(desc(schema.enjoymentScores.createdAt))
    .limit(limit);
}

export const enjoymentService = {
  record,
  getLatest,
  getHistory,
};
