/**
 * Results service — record, delete, and undo workout results.
 * Every mutation pushes an undo entry for reversibility.
 */
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { programInstances, workoutResults, undoEntries } from '../db/schema';
import { ApiError } from '../middleware/error-handler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkoutResultRow = typeof workoutResults.$inferSelect;
type UndoEntryRow = typeof undoEntries.$inferSelect;

export interface RecordResultInput {
  readonly workoutIndex: number;
  readonly slotId: string;
  readonly result: 'success' | 'fail';
  readonly amrapReps?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyInstanceOwnership(userId: string, instanceId: string): Promise<void> {
  const [instance] = await db
    .select({ id: programInstances.id })
    .from(programInstances)
    .where(and(eq(programInstances.id, instanceId), eq(programInstances.userId, userId)))
    .limit(1);

  if (!instance) {
    throw new ApiError(404, 'Program instance not found', 'INSTANCE_NOT_FOUND');
  }
}

// ---------------------------------------------------------------------------
// Record a workout result
// ---------------------------------------------------------------------------

export async function recordResult(
  userId: string,
  instanceId: string,
  input: RecordResultInput
): Promise<WorkoutResultRow> {
  await verifyInstanceOwnership(userId, instanceId);

  // Check if a result already exists for this slot (for undo entry)
  const [existing] = await db
    .select()
    .from(workoutResults)
    .where(
      and(
        eq(workoutResults.instanceId, instanceId),
        eq(workoutResults.workoutIndex, input.workoutIndex),
        eq(workoutResults.slotId, input.slotId)
      )
    )
    .limit(1);

  // Push undo entry (stores previous state so we can reverse this)
  await db.insert(undoEntries).values({
    instanceId,
    workoutIndex: input.workoutIndex,
    slotId: input.slotId,
    prevResult: existing?.result ?? null,
  });

  if (existing) {
    // Update existing result
    const [updated] = await db
      .update(workoutResults)
      .set({
        result: input.result,
        amrapReps: input.amrapReps ?? null,
      })
      .where(eq(workoutResults.id, existing.id))
      .returning();

    if (!updated) {
      throw new ApiError(500, 'Failed to update result', 'UPDATE_FAILED');
    }
    return updated;
  }

  // Insert new result
  const [inserted] = await db
    .insert(workoutResults)
    .values({
      instanceId,
      workoutIndex: input.workoutIndex,
      slotId: input.slotId,
      result: input.result,
      amrapReps: input.amrapReps ?? null,
    })
    .returning();

  if (!inserted) {
    throw new ApiError(500, 'Failed to record result', 'INSERT_FAILED');
  }

  // Update instance timestamp
  await db
    .update(programInstances)
    .set({ updatedAt: new Date() })
    .where(eq(programInstances.id, instanceId));

  return inserted;
}

// ---------------------------------------------------------------------------
// Delete a workout result
// ---------------------------------------------------------------------------

export async function deleteResult(
  userId: string,
  instanceId: string,
  workoutIndex: number,
  slotId: string
): Promise<void> {
  await verifyInstanceOwnership(userId, instanceId);

  const [existing] = await db
    .select()
    .from(workoutResults)
    .where(
      and(
        eq(workoutResults.instanceId, instanceId),
        eq(workoutResults.workoutIndex, workoutIndex),
        eq(workoutResults.slotId, slotId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Result not found', 'RESULT_NOT_FOUND');
  }

  // Push undo entry before deleting
  await db.insert(undoEntries).values({
    instanceId,
    workoutIndex,
    slotId,
    prevResult: existing.result,
  });

  await db.delete(workoutResults).where(eq(workoutResults.id, existing.id));

  await db
    .update(programInstances)
    .set({ updatedAt: new Date() })
    .where(eq(programInstances.id, instanceId));
}

// ---------------------------------------------------------------------------
// Undo last action
// ---------------------------------------------------------------------------

export async function undoLast(userId: string, instanceId: string): Promise<UndoEntryRow | null> {
  await verifyInstanceOwnership(userId, instanceId);

  // Pop the most recent undo entry (LIFO — highest id)
  const [entry] = await db
    .select()
    .from(undoEntries)
    .where(eq(undoEntries.instanceId, instanceId))
    .orderBy(desc(undoEntries.id))
    .limit(1);

  if (!entry) {
    return null; // Nothing to undo
  }

  // Remove the undo entry (consumed)
  await db.delete(undoEntries).where(eq(undoEntries.id, entry.id));

  if (entry.prevResult === null) {
    // Previous state was "no result" — delete the current result
    await db
      .delete(workoutResults)
      .where(
        and(
          eq(workoutResults.instanceId, instanceId),
          eq(workoutResults.workoutIndex, entry.workoutIndex),
          eq(workoutResults.slotId, entry.slotId)
        )
      );
  } else {
    // Previous state was a result — restore it (upsert)
    const [existing] = await db
      .select()
      .from(workoutResults)
      .where(
        and(
          eq(workoutResults.instanceId, instanceId),
          eq(workoutResults.workoutIndex, entry.workoutIndex),
          eq(workoutResults.slotId, entry.slotId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(workoutResults)
        .set({ result: entry.prevResult })
        .where(eq(workoutResults.id, existing.id));
    } else {
      await db.insert(workoutResults).values({
        instanceId,
        workoutIndex: entry.workoutIndex,
        slotId: entry.slotId,
        result: entry.prevResult,
      });
    }
  }

  await db
    .update(programInstances)
    .set({ updatedAt: new Date() })
    .where(eq(programInstances.id, instanceId));

  return entry;
}
