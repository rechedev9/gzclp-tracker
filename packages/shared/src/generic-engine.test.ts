import { describe, it, expect } from 'bun:test';
import { computeGenericProgram, roundToNearestHalf as round } from './generic-engine';
import { GZCLP_DEFINITION } from './programs/gzclp';
import { DEFAULT_WEIGHTS, buildResults } from '../test/fixtures';
import type { ProgramDefinition, GenericResults } from './types/program';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Minimal single-exercise program for testing individual rules in isolation. */
function makeDefinition(overrides: {
  stages?: Array<{ sets: number; reps: number; amrap?: boolean }>;
  onSuccess?: ProgramDefinition['days'][number]['slots'][number]['onSuccess'];
  onUndefined?: ProgramDefinition['days'][number]['slots'][number]['onUndefined'];
  onMidStageFail?: ProgramDefinition['days'][number]['slots'][number]['onMidStageFail'];
  onFinalStageFail?: ProgramDefinition['days'][number]['slots'][number]['onFinalStageFail'];
  weightIncrement?: number;
  totalWorkouts?: number;
}): ProgramDefinition {
  return {
    id: 'test',
    name: 'Test',
    description: '',
    author: 'test',
    version: 1,
    category: 'test',
    source: 'preset',
    cycleLength: 1,
    totalWorkouts: overrides.totalWorkouts ?? 10,
    workoutsPerWeek: 3,
    exercises: { ex: { name: 'Exercise' } },
    configFields: [{ key: 'ex', label: 'Exercise', type: 'weight', min: 0, step: 2.5 }],
    weightIncrements: { ex: overrides.weightIncrement ?? 5 },
    days: [
      {
        name: 'Day 1',
        slots: [
          {
            id: 'slot1',
            exerciseId: 'ex',
            tier: 't1',
            stages: overrides.stages ?? [
              { sets: 5, reps: 3 },
              { sets: 6, reps: 2 },
              { sets: 10, reps: 1 },
            ],
            onSuccess: overrides.onSuccess ?? { type: 'add_weight' },
            onUndefined: overrides.onUndefined,
            onMidStageFail: overrides.onMidStageFail ?? { type: 'advance_stage' },
            onFinalStageFail: overrides.onFinalStageFail ?? {
              type: 'deload_percent',
              percent: 10,
            },
            startWeightKey: 'ex',
          },
        ],
      },
    ],
  };
}

/** GZCLP day slot map used for converting legacy results in parity tests. */
const GZCLP_DAY_SLOT_MAP = GZCLP_DEFINITION.days.map((day) => ({
  t1: day.slots.find((s) => s.tier === 't1')?.id ?? '',
  t2: day.slots.find((s) => s.tier === 't2')?.id ?? '',
  t3: day.slots.find((s) => s.tier === 't3')?.id ?? '',
}));

/** Convert GZCLP legacy results to generic format for parity tests. */
function toGenericResults(entries: Parameters<typeof buildResults>[0]): GenericResults {
  const generic: GenericResults = {};
  for (const [i, res] of entries) {
    const dayMap = GZCLP_DAY_SLOT_MAP[i % 4];
    const workout: Record<string, { result?: 'success' | 'fail'; amrapReps?: number }> = {};
    if (res.t1 !== undefined || res.t1Reps !== undefined) {
      workout[dayMap.t1] = { result: res.t1, amrapReps: res.t1Reps };
    }
    if (res.t2 !== undefined) {
      workout[dayMap.t2] = { result: res.t2 };
    }
    if (res.t3 !== undefined || res.t3Reps !== undefined) {
      workout[dayMap.t3] = { result: res.t3, amrapReps: res.t3Reps };
    }
    if (Object.keys(workout).length > 0) {
      generic[String(i)] = workout;
    }
  }
  return generic;
}

/** Convert all-success legacy results to generic format. */
function toGenericSuccessResults(n: number): GenericResults {
  return toGenericResults(
    Array.from({ length: n }, (_, i) => [
      i,
      { t1: 'success' as const, t2: 'success' as const, t3: 'success' as const },
    ])
  );
}

// ---------------------------------------------------------------------------
// roundToNearestHalf
// ---------------------------------------------------------------------------
describe('roundToNearestHalf', () => {
  it('rounds 0.7 to 0.5', () => {
    expect(round(0.7)).toBe(0.5);
  });

  it('rounds 0.8 to 1.0', () => {
    expect(round(0.8)).toBe(1.0);
  });

  it('returns 0 for negative values', () => {
    expect(round(-5)).toBe(0);
  });

  it('returns the value unchanged when already a half', () => {
    expect(round(16.5)).toBe(16.5);
  });
});

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------
describe('computeGenericProgram: structural invariants', () => {
  it('produces exactly totalWorkouts rows', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    expect(rows).toHaveLength(GZCLP_DEFINITION.totalWorkouts);
  });

  it('cycles days by cycleLength', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].dayName).toBe(GZCLP_DEFINITION.days[i % 4].name);
    }
  });

  it('never produces negative weights', () => {
    const allFail: GenericResults = {};
    for (let i = 0; i < 90; i++) {
      allFail[String(i)] = {
        [GZCLP_DAY_SLOT_MAP[i % 4].t1]: { result: 'fail' },
        [GZCLP_DAY_SLOT_MAP[i % 4].t2]: { result: 'fail' },
        [GZCLP_DAY_SLOT_MAP[i % 4].t3]: { result: 'fail' },
      };
    }
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, allFail);
    for (const row of rows) {
      for (const slot of row.slots) {
        expect(slot.weight).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps stage within [0, stages.length - 1] under all failures', () => {
    const allFail: GenericResults = {};
    for (let i = 0; i < 90; i++) {
      allFail[String(i)] = {
        [GZCLP_DAY_SLOT_MAP[i % 4].t1]: { result: 'fail' },
      };
    }
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, allFail);
    for (const row of rows) {
      for (const slot of row.slots) {
        expect(slot.stage).toBeGreaterThanOrEqual(0);
        const maxStage =
          GZCLP_DEFINITION.days.flatMap((d) => d.slots).find((s) => s.id === slot.slotId)?.stages
            .length ?? 1;
        expect(slot.stage).toBeLessThan(maxStage);
      }
    }
  });

  it('handles empty results (all implicit pass)', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    expect(rows).toHaveLength(90);
  });
});

// ---------------------------------------------------------------------------
// GZCLP parity — generic engine must match legacy computeProgram outputs
// ---------------------------------------------------------------------------
describe('computeGenericProgram: GZCLP parity', () => {
  it('matches T1 start weights from DEFAULT_WEIGHTS', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    // Day 1 t1 = squat
    expect(rows[0].slots.find((s) => s.tier === 't1')?.weight).toBe(DEFAULT_WEIGHTS.squat);
    // Day 2 t1 = ohp
    expect(rows[1].slots.find((s) => s.tier === 't1')?.weight).toBe(DEFAULT_WEIGHTS.ohp);
    // Day 3 t1 = bench
    expect(rows[2].slots.find((s) => s.tier === 't1')?.weight).toBe(DEFAULT_WEIGHTS.bench);
    // Day 4 t1 = deadlift
    expect(rows[3].slots.find((s) => s.tier === 't1')?.weight).toBe(DEFAULT_WEIGHTS.deadlift);
  });

  it('matches T2 start weights as 65% rounded to nearest 0.5', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    // Day 1 t2 = bench: 40 * 0.65 = 26
    expect(rows[0].slots.find((s) => s.tier === 't2')?.weight).toBe(
      round(DEFAULT_WEIGHTS.bench * 0.65)
    );
    // Day 2 t2 = deadlift: 80 * 0.65 = 52
    expect(rows[1].slots.find((s) => s.tier === 't2')?.weight).toBe(
      round(DEFAULT_WEIGHTS.deadlift * 0.65)
    );
    // Day 4 t2 = ohp: 25 * 0.65 = 16.25 → 16.5
    expect(rows[3].slots.find((s) => s.tier === 't2')?.weight).toBe(
      round(DEFAULT_WEIGHTS.ohp * 0.65)
    );
  });

  it('does NOT increase T3 weight with empty results (matches legacy implicit-pass behavior)', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    // latpulldown T3 at Day 1 (i=0,4,8,...) and Day 3 (i=2,6,10,...)
    const t3Rows = rows.filter(
      (r) => r.slots.find((s) => s.tier === 't3')?.exerciseId === 'latpulldown'
    );
    const t3Weights = t3Rows.map((r) => r.slots.find((s) => s.tier === 't3')?.weight);
    // All should be the same starting weight since no explicit success
    for (const w of t3Weights) {
      expect(w).toBe(DEFAULT_WEIGHTS.latpulldown);
    }
  });

  it('increases T3 on explicit success only', () => {
    const results = toGenericResults([
      [0, { t3: 'success' }],
      [2, { t3: 'fail' }],
      [4, { t3: 'success' }],
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    // latpulldown at 0, 2, 4, 6
    expect(rows[0].slots.find((s) => s.tier === 't3')?.weight).toBe(30);
    expect(rows[2].slots.find((s) => s.tier === 't3')?.weight).toBe(32.5); // after success at 0
    expect(rows[4].slots.find((s) => s.tier === 't3')?.weight).toBe(32.5); // no change on fail at 2
    expect(rows[6].slots.find((s) => s.tier === 't3')?.weight).toBe(35); // after success at 4
  });

  it('T1 increases weight on each implicit pass (empty results)', () => {
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, {});
    // squat T1 at indexes 0, 4, 8, 12, ...
    const squatT1 = rows.filter(
      (r) => r.slots.find((s) => s.tier === 't1')?.exerciseId === 'squat'
    );
    expect(squatT1[0].slots.find((s) => s.tier === 't1')?.weight).toBe(60);
    expect(squatT1[1].slots.find((s) => s.tier === 't1')?.weight).toBe(65);
    expect(squatT1[2].slots.find((s) => s.tier === 't1')?.weight).toBe(70);
  });

  it('T1 advances through stages on failure then deloads', () => {
    const results = toGenericResults([
      [0, { t1: 'fail' }], // stage 0 → stage 1
      [4, { t1: 'fail' }], // stage 1 → stage 2
      [8, { t1: 'fail' }], // stage 2 → deload, reset stage 0
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    const t1 = (i: number) => rows[i].slots.find((s) => s.tier === 't1');

    expect(t1(4)?.stage).toBe(1);
    expect(t1(4)?.weight).toBe(60);
    expect(t1(4)?.sets).toBe(6);
    expect(t1(4)?.reps).toBe(2);

    expect(t1(8)?.stage).toBe(2);
    expect(t1(8)?.weight).toBe(60);
    expect(t1(8)?.sets).toBe(10);
    expect(t1(8)?.reps).toBe(1);

    expect(t1(12)?.stage).toBe(0);
    expect(t1(12)?.weight).toBe(round(60 * 0.9)); // 54
    expect(t1(12)?.sets).toBe(5);
    expect(t1(12)?.reps).toBe(3);
  });

  it('T2 advances through stages then adds 15kg on final fail', () => {
    const baseT2 = round(DEFAULT_WEIGHTS.bench * 0.65); // 26
    const results = toGenericResults([
      [0, { t2: 'fail' }],
      [4, { t2: 'fail' }],
      [8, { t2: 'fail' }],
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    const t2 = (i: number) => rows[i].slots.find((s) => s.tier === 't2');

    expect(t2(4)?.stage).toBe(1);
    expect(t2(4)?.weight).toBe(baseT2);
    expect(t2(8)?.stage).toBe(2);
    expect(t2(12)?.stage).toBe(0);
    expect(t2(12)?.weight).toBe(baseT2 + 15);
  });

  it('T1 success at stage 1 increases weight without changing stage', () => {
    const results = toGenericResults([
      [0, { t1: 'fail' }],
      [4, { t1: 'success' }],
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    expect(rows[8].slots.find((s) => s.tier === 't1')?.weight).toBe(65);
  });

  it('uses 2.5 increment for bench and ohp T1, 5 for squat and deadlift', () => {
    const results = toGenericResults([
      [1, { t1: 'success' }], // OHP
      [2, { t1: 'success' }], // Bench
      [0, { t1: 'success' }], // Squat
      [3, { t1: 'success' }], // Deadlift
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    expect(rows[5].slots.find((s) => s.tier === 't1')?.weight).toBe(27.5); // OHP +2.5
    expect(rows[6].slots.find((s) => s.tier === 't1')?.weight).toBe(42.5); // Bench +2.5
    expect(rows[4].slots.find((s) => s.tier === 't1')?.weight).toBe(65); // Squat +5
    expect(rows[7].slots.find((s) => s.tier === 't1')?.weight).toBe(85); // Deadlift +5
  });

  it('keeps all stages at 0 with all-success results', () => {
    const results = toGenericSuccessResults(90);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    for (const row of rows) {
      for (const slot of row.slots) {
        expect(slot.stage).toBe(0);
      }
    }
  });

  it('preserves amrapReps in slot result', () => {
    const results = toGenericResults([
      [0, { t1: 'success', t1Reps: 8, t3: 'success', t3Reps: 30 }],
    ]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    expect(rows[0].slots.find((s) => s.tier === 't1')?.amrapReps).toBe(8);
    expect(rows[0].slots.find((s) => s.tier === 't3')?.amrapReps).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// advance_stage_add_weight rule
// ---------------------------------------------------------------------------
describe('advance_stage_add_weight rule', () => {
  it('advances stage AND adds weight on mid-stage fail', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
        { sets: 10, reps: 1 },
      ],
      onMidStageFail: { type: 'advance_stage_add_weight' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[1].slots[0].stage).toBe(1);
    expect(rows[1].slots[0].weight).toBe(105);
  });

  it('advances stage AND adds weight on explicit success', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onSuccess: { type: 'advance_stage_add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = { '0': { slot1: { result: 'success' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[1].slots[0].stage).toBe(1);
    expect(rows[1].slots[0].weight).toBe(105);
  });

  it('uses the correct increment from weightIncrements', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onSuccess: { type: 'advance_stage_add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 2.5,
    });
    const results: GenericResults = { '0': { slot1: { result: 'success' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[1].slots[0].weight).toBe(102.5);
  });

  it('clamps stage at maxStage when already at the top', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onSuccess: { type: 'advance_stage_add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = {
      '0': { slot1: { result: 'success' } }, // stage 0 → 1
      '1': { slot1: { result: 'success' } }, // stage 1 → still 1 (clamped)
    };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[2].slots[0].stage).toBe(1); // maxStage = 1
    expect(rows[2].slots[0].weight).toBe(110); // 100 + 5 + 5
  });

  it('does NOT fire on final-stage fail (uses onFinalStageFail instead)', () => {
    const def = makeDefinition({
      stages: [{ sets: 5, reps: 3 }], // single stage, so any fail is final
      onMidStageFail: { type: 'advance_stage_add_weight' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[1].slots[0].stage).toBe(0); // no change
    expect(rows[1].slots[0].weight).toBe(100); // no change
  });

  it('marks isChanged=true when triggered by a fail', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onMidStageFail: { type: 'advance_stage_add_weight' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[1].slots[0].isChanged).toBe(true);
  });

  it('does NOT mark isChanged when triggered by implicit pass (onSuccess)', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onSuccess: { type: 'advance_stage_add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const rows = computeGenericProgram(def, { ex: 100 }, {});

    expect(rows[1].slots[0].isChanged).toBe(false);
  });

  it('advances multiple stages across multiple workouts', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
        { sets: 10, reps: 1 },
      ],
      onSuccess: { type: 'advance_stage_add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'no_change' },
      weightIncrement: 5,
    });
    const results: GenericResults = {
      '0': { slot1: { result: 'success' } }, // 100 → stage 1, weight 105
      '1': { slot1: { result: 'success' } }, // 105 → stage 2, weight 110
    };
    const rows = computeGenericProgram(def, { ex: 100 }, results);

    expect(rows[2].slots[0].stage).toBe(2);
    expect(rows[2].slots[0].weight).toBe(110);
  });
});

// ---------------------------------------------------------------------------
// Isolated rule behaviors
// ---------------------------------------------------------------------------
describe('computeGenericProgram: isolated rules', () => {
  it('add_weight: increases weight by increment', () => {
    const def = makeDefinition({ onSuccess: { type: 'add_weight' }, weightIncrement: 5 });
    const results: GenericResults = { '0': { slot1: { result: 'success' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].weight).toBe(105);
  });

  it('add_weight: does not change stage', () => {
    const def = makeDefinition({ onSuccess: { type: 'add_weight' }, weightIncrement: 5 });
    const results: GenericResults = { '0': { slot1: { result: 'success' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].stage).toBe(0);
  });

  it('advance_stage: increments stage without changing weight', () => {
    const def = makeDefinition({
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].stage).toBe(1);
    expect(rows[1].slots[0].weight).toBe(100);
  });

  it('deload_percent: applies correct percentage and resets stage', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
        { sets: 10, reps: 1 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'deload_percent', percent: 10 },
    });
    const results: GenericResults = {
      '0': { slot1: { result: 'fail' } }, // → stage 1
      '1': { slot1: { result: 'fail' } }, // → stage 2
      '2': { slot1: { result: 'fail' } }, // → deload 10%, stage 0
    };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[3].slots[0].stage).toBe(0);
    expect(rows[3].slots[0].weight).toBe(round(100 * 0.9)); // 90
  });

  it('deload_percent: does not produce negative weights', () => {
    const def = makeDefinition({
      stages: [{ sets: 5, reps: 3 }],
      onFinalStageFail: { type: 'deload_percent', percent: 99 },
      totalWorkouts: 20,
    });
    const allFail: GenericResults = {};
    for (let i = 0; i < 20; i++) {
      allFail[String(i)] = { slot1: { result: 'fail' } };
    }
    const rows = computeGenericProgram(def, { ex: 5 }, allFail);
    for (const row of rows) {
      expect(row.slots[0].weight).toBeGreaterThanOrEqual(0);
    }
  });

  it('add_weight_reset_stage: adds amount and resets stage to 0', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
        { sets: 10, reps: 1 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'add_weight_reset_stage', amount: 15 },
    });
    const results: GenericResults = {
      '0': { slot1: { result: 'fail' } }, // → stage 1
      '1': { slot1: { result: 'fail' } }, // → stage 2
      '2': { slot1: { result: 'fail' } }, // → +15, stage 0
    };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[3].slots[0].stage).toBe(0);
    expect(rows[3].slots[0].weight).toBe(round(100 + 15)); // 115
  });

  it('no_change: neither weight nor stage changes on fail', () => {
    const def = makeDefinition({
      stages: [{ sets: 5, reps: 3 }],
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].stage).toBe(0);
    expect(rows[1].slots[0].weight).toBe(100);
  });

  it('onUndefined: overrides implicit pass when defined', () => {
    const def = makeDefinition({
      onSuccess: { type: 'add_weight' },
      onUndefined: { type: 'no_change' },
      weightIncrement: 5,
    });
    // No results → triggers onUndefined path
    const rows = computeGenericProgram(def, { ex: 100 }, {});
    // All workouts should have weight=100 since implicit pass uses no_change
    for (const row of rows) {
      expect(row.slots[0].weight).toBe(100);
    }
  });

  it('implicit pass uses onSuccess when onUndefined is not set', () => {
    const def = makeDefinition({
      onSuccess: { type: 'add_weight' },
      weightIncrement: 5,
    });
    const rows = computeGenericProgram(def, { ex: 100 }, {});
    // Each workout adds 5
    expect(rows[1].slots[0].weight).toBe(105);
    expect(rows[2].slots[0].weight).toBe(110);
  });

  it('sets/reps reflect the active stage', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
        { sets: 10, reps: 1 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = {
      '0': { slot1: { result: 'fail' } }, // → stage 1
      '1': { slot1: { result: 'fail' } }, // → stage 2
    };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[0].slots[0].sets).toBe(5);
    expect(rows[0].slots[0].reps).toBe(3);
    expect(rows[1].slots[0].sets).toBe(6);
    expect(rows[1].slots[0].reps).toBe(2);
    expect(rows[2].slots[0].sets).toBe(10);
    expect(rows[2].slots[0].reps).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// isChanged semantics
// ---------------------------------------------------------------------------
describe('computeGenericProgram: isChanged semantics', () => {
  it('isChanged=false before any failure', () => {
    const def = makeDefinition({});
    const rows = computeGenericProgram(def, { ex: 100 }, {});
    expect(rows[0].slots[0].isChanged).toBe(false);
  });

  it('isChanged=true after a fail that changes state (advance_stage)', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].isChanged).toBe(true);
  });

  it('isChanged=true after a fail that changes state (add_weight_reset_stage)', () => {
    const def = makeDefinition({
      stages: [{ sets: 5, reps: 3 }],
      onFinalStageFail: { type: 'add_weight_reset_stage', amount: 15 },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].isChanged).toBe(true);
  });

  it('isChanged=false after a fail with no_change rule', () => {
    const def = makeDefinition({
      stages: [{ sets: 5, reps: 3 }],
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].slots[0].isChanged).toBe(false);
  });

  it('everChanged persists once set', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    // All subsequent rows should have isChanged=true even without further failures
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].slots[0].isChanged).toBe(true);
    }
  });

  it('GenericWorkoutRow.isChanged is true when any slot isChanged', () => {
    const def = makeDefinition({
      stages: [
        { sets: 5, reps: 3 },
        { sets: 6, reps: 2 },
      ],
      onMidStageFail: { type: 'advance_stage' },
      onFinalStageFail: { type: 'no_change' },
    });
    const results: GenericResults = { '0': { slot1: { result: 'fail' } } };
    const rows = computeGenericProgram(def, { ex: 100 }, results);
    expect(rows[1].isChanged).toBe(true);
  });

  it('GZCLP parity: T3 fail does NOT affect row isChanged', () => {
    // T3 fail uses no_change → changesState=false → slot isChanged stays false
    const results = toGenericResults([[0, { t3: 'fail' }]]);
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);
    // The workout with T3 fail
    const t3Slot = rows[0].slots.find((s) => s.tier === 't3');
    expect(t3Slot?.result).toBe('fail');
    // Next workout's T3 slot should still have isChanged=false
    const nextT3 = rows[2].slots.find((s) => s.tier === 't3');
    expect(nextT3?.isChanged).toBe(false);
    // Row itself: isChanged tracks T1+T2, not T3
    expect(rows[1].isChanged).toBe(false);
  });

  it('GZCLP parity: T1 fail marks its exercise changed but not others', () => {
    const results = toGenericResults([[0, { t1: 'fail' }]]); // squat T1 fails
    const rows = computeGenericProgram(GZCLP_DEFINITION, DEFAULT_WEIGHTS, results);

    // Next squat T1 appearance (workout 4) should be changed
    expect(rows[4].isChanged).toBe(true);
    // OHP on Day 2 should not be affected
    expect(rows[1].isChanged).toBe(false);
    // Bench on Day 3 should not be affected
    expect(rows[2].isChanged).toBe(false);
  });
});
