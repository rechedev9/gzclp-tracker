/**
 * Seeds idempotency integration test.
 *
 * IMPORTANT: This test requires a running PostgreSQL database with all
 * migrations applied. It is SKIPPED by default in unit test runs.
 * To run it manually:
 *   DATABASE_URL=... bun test apps/api/src/db/seeds/seeds.test.ts
 *
 * Verifies REQ-DATA-004: running seeds twice produces the same counts
 * with no errors (idempotent via onConflictDoNothing).
 */
process.env['LOG_LEVEL'] = 'silent';

import { describe, it, expect } from 'bun:test';

// Detect if DATABASE_URL is set — skip if not
const hasDb = typeof process.env['DATABASE_URL'] === 'string' && process.env['DATABASE_URL'] !== '';

describe.skipIf(!hasDb)('seeds idempotency (integration)', () => {
  it('should run muscle-groups seed twice without error', async () => {
    const { getDb } = await import('../index');
    const { seedMuscleGroups } = await import('./muscle-groups-seed');
    const db = getDb();

    // First run
    await seedMuscleGroups(db);

    // Second run — idempotent, should not throw
    await expect(seedMuscleGroups(db)).resolves.toBeUndefined();
  });

  it('should run exercises seed twice without error', async () => {
    const { getDb } = await import('../index');
    const { seedExercises } = await import('./exercises-seed');
    const db = getDb();

    await seedExercises(db);
    await expect(seedExercises(db)).resolves.toBeUndefined();
  });

  it('should run program-templates seed twice without error', async () => {
    const { getDb } = await import('../index');
    const { seedProgramTemplates } = await import('./program-templates-seed');
    const db = getDb();

    await seedProgramTemplates(db);
    await expect(seedProgramTemplates(db)).resolves.toBeUndefined();
  });

  it('should produce consistent counts across runs', async () => {
    const { getDb } = await import('../index');
    const { seedMuscleGroups } = await import('./muscle-groups-seed');
    const { seedExercises } = await import('./exercises-seed');
    const { seedProgramTemplates } = await import('./program-templates-seed');
    const { muscleGroups, exercises, programTemplates } = await import('../schema');
    const { count } = await import('drizzle-orm');
    const db = getDb();

    // Run all seeds
    await seedMuscleGroups(db);
    await seedExercises(db);
    await seedProgramTemplates(db);

    // Count after first run
    const [mgCount1] = await db.select({ count: count() }).from(muscleGroups);
    const [exCount1] = await db.select({ count: count() }).from(exercises);
    const [ptCount1] = await db.select({ count: count() }).from(programTemplates);

    // Run again
    await seedMuscleGroups(db);
    await seedExercises(db);
    await seedProgramTemplates(db);

    // Count after second run
    const [mgCount2] = await db.select({ count: count() }).from(muscleGroups);
    const [exCount2] = await db.select({ count: count() }).from(exercises);
    const [ptCount2] = await db.select({ count: count() }).from(programTemplates);

    // Counts should be identical
    expect(mgCount2?.count).toBe(mgCount1?.count);
    expect(exCount2?.count).toBe(exCount1?.count);
    expect(ptCount2?.count).toBe(ptCount1?.count);
  });
});
