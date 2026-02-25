/**
 * Exercises service unit tests — verifies listExercises, listMuscleGroups,
 * and createExercise behavior with mocked DB.
 *
 * Strategy: mock getDb() at module level so the service functions use our fake.
 * Each query chain is tracked by call order, allowing tests to control responses.
 */
process.env['LOG_LEVEL'] = 'silent';

import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ---------------------------------------------------------------------------
// Mock DB — track calls via a queue
// ---------------------------------------------------------------------------

interface ExerciseRow {
  readonly id: string;
  readonly name: string;
  readonly muscleGroupId: string;
  readonly equipment: string | null;
  readonly isCompound: boolean;
  readonly isPreset: boolean;
  readonly createdBy: string | null;
  readonly createdAt: Date;
}

const NOW = new Date();

const PRESET_EXERCISE: ExerciseRow = {
  id: 'squat',
  name: 'Sentadilla',
  muscleGroupId: 'legs',
  equipment: 'barbell',
  isCompound: true,
  isPreset: true,
  createdBy: null,
  createdAt: NOW,
};

const USER_EXERCISE: ExerciseRow = {
  id: 'my_curl',
  name: 'My Custom Curl',
  muscleGroupId: 'arms',
  equipment: 'dumbbell',
  isCompound: false,
  isPreset: false,
  createdBy: 'user-1',
  createdAt: NOW,
};

/**
 * Queue-based mock: each call to select().from() pops the next result
 * from selectQueue. insert().values().onConflictDoNothing().returning()
 * returns insertResult.
 */
let selectQueue: unknown[][] = [];
let insertResult: unknown[] = [];

function chainable(result: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  obj['where'] = mock(() => chainable(result));
  obj['limit'] = mock(() => Promise.resolve(result.slice(0, 1)));
  // Make thenable so `await db.select().from(table).where(...)` works
  obj['then'] = (fn: (val: unknown[]) => unknown, reject?: (err: unknown) => unknown): unknown => {
    try {
      return Promise.resolve(fn(result));
    } catch (err: unknown) {
      if (reject) return reject(err);
      return Promise.reject(err);
    }
  };
  return obj;
}

function createMockDb(): unknown {
  return {
    select: mock(function select() {
      return {
        from: mock(function from() {
          const result = selectQueue.shift() ?? [];
          return chainable(result);
        }),
      };
    }),
    insert: mock(function insert() {
      return {
        values: mock(function values() {
          return {
            onConflictDoNothing: mock(function onConflictDoNothing() {
              return {
                returning: mock(() => Promise.resolve(insertResult)),
              };
            }),
            returning: mock(() => Promise.resolve(insertResult)),
          };
        }),
      };
    }),
  };
}

let mockDb = createMockDb();

mock.module('../db', () => ({
  getDb: () => mockDb,
}));

// Must import AFTER mock.module
const { listExercises, listMuscleGroups, createExercise } = await import('./exercises');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  selectQueue = [];
  insertResult = [];
  mockDb = createMockDb();
});

describe('listExercises', () => {
  it('should return exercises from DB', async () => {
    // listExercises does: db.select().from(exercises).where(condition)
    selectQueue = [[PRESET_EXERCISE]];

    const result = await listExercises(undefined);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBe('squat');
    expect(result[0]?.isPreset).toBe(true);
  });

  it('should map DB rows to ExerciseEntry interface', async () => {
    selectQueue = [[PRESET_EXERCISE]];

    const result = await listExercises(undefined);

    const entry = result[0];
    expect(entry?.name).toBe('Sentadilla');
    expect(entry?.muscleGroupId).toBe('legs');
    expect(entry?.equipment).toBe('barbell');
    expect(entry?.isCompound).toBe(true);
  });

  it('should return both preset and user exercises when userId is provided', async () => {
    selectQueue = [[PRESET_EXERCISE, USER_EXERCISE]];

    const result = await listExercises('user-1');

    expect(result).toHaveLength(2);
  });
});

describe('listMuscleGroups', () => {
  it('should return muscle groups from DB', async () => {
    // listMuscleGroups does: db.select({id, name}).from(muscleGroups)
    selectQueue = [[{ id: 'legs', name: 'Piernas' }]];

    const result = await listMuscleGroups();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBe('legs');
    expect(result[0]?.name).toBe('Piernas');
  });
});

describe('createExercise', () => {
  it('should return Ok with created exercise on success', async () => {
    const createdRow: ExerciseRow = {
      id: 'custom_press',
      name: 'Custom Press',
      muscleGroupId: 'chest',
      equipment: null,
      isCompound: false,
      isPreset: false,
      createdBy: 'user-1',
      createdAt: NOW,
    };
    // createExercise does: 1) select muscle group, 2) insert exercise
    selectQueue = [[{ id: 'chest' }]]; // muscle group validation
    insertResult = [createdRow];

    const result = await createExercise('user-1', {
      id: 'custom_press',
      name: 'Custom Press',
      muscleGroupId: 'chest',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('custom_press');
    expect(result.value.isPreset).toBe(false);
    expect(result.value.createdBy).toBe('user-1');
  });

  it('should return Err(INVALID_MUSCLE_GROUP) when muscle group does not exist', async () => {
    selectQueue = [[]]; // muscle group not found

    const result = await createExercise('user-1', {
      id: 'bad_exercise',
      name: 'Bad Exercise',
      muscleGroupId: 'nonexistent',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_MUSCLE_GROUP');
  });

  it('should return Err(EXERCISE_ID_CONFLICT) when ID already exists', async () => {
    selectQueue = [[{ id: 'legs' }]]; // muscle group exists
    insertResult = []; // onConflictDoNothing returns empty when conflict

    const result = await createExercise('user-1', {
      id: 'squat',
      name: 'Duplicate Squat',
      muscleGroupId: 'legs',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EXERCISE_ID_CONFLICT');
  });
});
