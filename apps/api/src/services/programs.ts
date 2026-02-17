/**
 * Program service — CRUD for program instances, results reconstruction.
 * Framework-agnostic: no Elysia dependency.
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { programInstances, workoutResults, undoEntries } from '../db/schema';
import { getProgramDefinition } from '@gzclp/shared/programs/registry';
import type { GenericResults, GenericUndoHistory } from '@gzclp/shared/types/program';
import { ApiError } from '../middleware/error-handler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InstanceRow = typeof programInstances.$inferSelect;
type WorkoutResultRow = typeof workoutResults.$inferSelect;
type UndoEntryRow = typeof undoEntries.$inferSelect;

export interface ProgramInstanceResponse {
  readonly id: string;
  readonly programId: string;
  readonly name: string;
  readonly config: unknown;
  readonly status: string;
  readonly results: GenericResults;
  readonly undoHistory: GenericUndoHistory;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reconstructs GenericResults from normalized workout_results rows. */
function buildGenericResults(rows: readonly WorkoutResultRow[]): GenericResults {
  const results: GenericResults = {};

  for (const row of rows) {
    const indexStr = String(row.workoutIndex);
    if (!results[indexStr]) {
      results[indexStr] = {};
    }
    results[indexStr][row.slotId] = {
      result: row.result as 'success' | 'fail',
      ...(row.amrapReps !== null ? { amrapReps: row.amrapReps } : {}),
    };
  }

  return results;
}

/** Reconstructs GenericUndoHistory from undo_entries rows. */
function buildUndoHistory(rows: readonly UndoEntryRow[]): GenericUndoHistory {
  return rows.map((row) => ({
    i: row.workoutIndex,
    slotId: row.slotId,
    ...(row.prevResult !== null ? { prev: row.prevResult as 'success' | 'fail' } : {}),
  }));
}

function toResponse(
  instance: InstanceRow,
  resultRows: readonly WorkoutResultRow[],
  undoRows: readonly UndoEntryRow[]
): ProgramInstanceResponse {
  return {
    id: instance.id,
    programId: instance.programId,
    name: instance.name,
    config: instance.config,
    status: instance.status,
    results: buildGenericResults(resultRows),
    undoHistory: buildUndoHistory(undoRows),
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function createInstance(
  userId: string,
  programId: string,
  name: string,
  config: Record<string, number>
): Promise<ProgramInstanceResponse> {
  // Validate program exists
  const definition = getProgramDefinition(programId);
  if (!definition) {
    throw new ApiError(400, `Unknown program: ${programId}`, 'INVALID_PROGRAM');
  }

  const [instance] = await db
    .insert(programInstances)
    .values({
      userId,
      programId,
      name,
      config,
      status: 'active',
    })
    .returning();

  if (!instance) {
    throw new ApiError(500, 'Failed to create program instance', 'CREATE_FAILED');
  }

  return toResponse(instance, [], []);
}

export async function getInstances(userId: string): Promise<ProgramInstanceResponse[]> {
  const instances = await db
    .select()
    .from(programInstances)
    .where(eq(programInstances.userId, userId));

  // For listing, return instances without full results (empty)
  return instances.map((i) => toResponse(i, [], []));
}

export async function getInstance(
  userId: string,
  instanceId: string
): Promise<ProgramInstanceResponse> {
  const [instance] = await db
    .select()
    .from(programInstances)
    .where(and(eq(programInstances.id, instanceId), eq(programInstances.userId, userId)))
    .limit(1);

  if (!instance) {
    throw new ApiError(404, 'Program instance not found', 'INSTANCE_NOT_FOUND');
  }

  // Fetch results and undo history
  const [resultRows, undoRows] = await Promise.all([
    db.select().from(workoutResults).where(eq(workoutResults.instanceId, instanceId)),
    db
      .select()
      .from(undoEntries)
      .where(eq(undoEntries.instanceId, instanceId))
      .orderBy(undoEntries.id),
  ]);

  return toResponse(instance, resultRows, undoRows);
}

export async function updateInstance(
  userId: string,
  instanceId: string,
  updates: { name?: string; status?: string; config?: Record<string, number> }
): Promise<ProgramInstanceResponse> {
  // Verify ownership
  const [existing] = await db
    .select()
    .from(programInstances)
    .where(and(eq(programInstances.id, instanceId), eq(programInstances.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Program instance not found', 'INSTANCE_NOT_FOUND');
  }

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name !== undefined) updateValues['name'] = updates.name;
  if (updates.status !== undefined) updateValues['status'] = updates.status;
  if (updates.config !== undefined) updateValues['config'] = updates.config;

  const [updated] = await db
    .update(programInstances)
    .set(updateValues)
    .where(eq(programInstances.id, instanceId))
    .returning();

  if (!updated) {
    throw new ApiError(500, 'Failed to update program instance', 'UPDATE_FAILED');
  }

  return toResponse(updated, [], []);
}

export async function deleteInstance(userId: string, instanceId: string): Promise<void> {
  // Verify ownership
  const [existing] = await db
    .select()
    .from(programInstances)
    .where(and(eq(programInstances.id, instanceId), eq(programInstances.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Program instance not found', 'INSTANCE_NOT_FOUND');
  }

  // CASCADE deletes workout_results and undo_entries
  await db.delete(programInstances).where(eq(programInstances.id, instanceId));
}
