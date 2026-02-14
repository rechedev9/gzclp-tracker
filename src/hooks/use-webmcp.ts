'use client';

import { useEffect, useRef } from 'react';
import type { StartWeights, Results, WorkoutRow, ResultValue, Tier } from '@/types';
import { TOTAL_WORKOUTS, T1_EXERCISES, NAMES } from '@/lib/program';
import { extractChartData, calculateStats } from '@/lib/stats';
import { isRecord } from '@/lib/type-guards';

interface UseWebMcpOptions {
  readonly startWeights: StartWeights | null;
  readonly results: Results;
  readonly rows: readonly WorkoutRow[];
  readonly generateProgram: (weights: StartWeights) => void;
  readonly markResult: (index: number, tier: Tier, value: ResultValue) => void;
  readonly setAmrapReps: (
    index: number,
    field: 't1Reps' | 't3Reps',
    reps: number | undefined
  ) => void;
  readonly undoLast: () => void;
}

interface ToolResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

function ok(data: unknown): ToolResult {
  return { success: true, data };
}

function err(error: string): ToolResult {
  return { success: false, error };
}

const VALID_EXERCISES = new Set<string>(T1_EXERCISES);

function isTier(value: unknown): value is Tier {
  return value === 't1' || value === 't2' || value === 't3';
}

function isResultValue(value: unknown): value is ResultValue {
  return value === 'success' || value === 'fail';
}

function isValidIndex(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < TOTAL_WORKOUTS
  );
}

export function useWebMcp(options: UseWebMcpOptions): void {
  const stateRef = useRef(options);

  useEffect(() => {
    stateRef.current = options;
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.modelContext) {
      return;
    }

    const mc = navigator.modelContext;
    const unregisters: Array<() => void> = [];

    const register = (tool: ModelContextTool): void => {
      const handle = mc.addTool(tool);
      unregisters.push(handle.unregister);
    };

    // --- Read-only tools ---

    register({
      name: 'getCurrentWorkout',
      description:
        'Get the next incomplete workout in the GZCLP program. Returns the workout details including exercises, weights, sets, reps, and any partial results.',
      input: { type: 'object', properties: {} },
      execute: async (): Promise<ToolResult> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        const current = rows.find((r) => !r.result.t1 || !r.result.t2 || !r.result.t3);
        if (!current) {
          return ok({ message: 'All 90 workouts completed!', completed: true });
        }
        return ok({
          index: current.index,
          dayName: current.dayName,
          t1: {
            exercise: NAMES[current.t1Exercise],
            weight: current.t1Weight,
            sets: current.t1Sets,
            reps: current.t1Reps,
            stage: current.t1Stage + 1,
            result: current.result.t1 ?? null,
          },
          t2: {
            exercise: NAMES[current.t2Exercise],
            weight: current.t2Weight,
            sets: current.t2Sets,
            reps: current.t2Reps,
            stage: current.t2Stage + 1,
            result: current.result.t2 ?? null,
          },
          t3: {
            exercise: NAMES[current.t3Exercise],
            weight: current.t3Weight,
            sets: 3,
            reps: 15,
            result: current.result.t3 ?? null,
          },
        });
      },
    });

    register({
      name: 'getProgram',
      description:
        'Get workout rows from the GZCLP program. Optionally pass startIndex and endIndex (0-89) to get a range. Returns all 90 rows by default.',
      input: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'First workout index (0-89), default 0' },
          endIndex: { type: 'number', description: 'Last workout index (0-89), default 89' },
        },
      },
      execute: async (input: unknown): Promise<ToolResult> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        let start = 0;
        let end = TOTAL_WORKOUTS - 1;
        if (isRecord(input)) {
          if (input.startIndex !== undefined) {
            if (!isValidIndex(input.startIndex)) {
              return err('startIndex must be an integer between 0 and 89.');
            }
            start = input.startIndex;
          }
          if (input.endIndex !== undefined) {
            if (!isValidIndex(input.endIndex)) {
              return err('endIndex must be an integer between 0 and 89.');
            }
            end = input.endIndex;
          }
        }
        if (start > end) {
          return err('startIndex must be <= endIndex.');
        }
        const slice = rows.slice(start, end + 1).map((r) => ({
          index: r.index,
          dayName: r.dayName,
          t1: { exercise: NAMES[r.t1Exercise], weight: r.t1Weight, stage: r.t1Stage + 1 },
          t2: { exercise: NAMES[r.t2Exercise], weight: r.t2Weight, stage: r.t2Stage + 1 },
          t3: { exercise: NAMES[r.t3Exercise], weight: r.t3Weight },
          completed: Boolean(r.result.t1 && r.result.t2 && r.result.t3),
        }));
        return ok(slice);
      },
    });

    register({
      name: 'getStats',
      description:
        'Get performance statistics for one or all T1 exercises (squat, bench, deadlift, ohp). Includes success rate, current weight, weight gained, and current stage.',
      input: {
        type: 'object',
        properties: {
          exercise: {
            type: 'string',
            description: 'Exercise name: squat, bench, deadlift, or ohp. Omit for all.',
          },
        },
      },
      execute: async (input: unknown): Promise<ToolResult> => {
        const { startWeights } = stateRef.current;
        if (!startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        const chartData = extractChartData(startWeights, stateRef.current.results);
        if (isRecord(input) && typeof input.exercise === 'string') {
          const ex = input.exercise.toLowerCase();
          if (!VALID_EXERCISES.has(ex)) {
            return err(`Invalid exercise. Must be one of: ${T1_EXERCISES.join(', ')}`);
          }
          const points = chartData[ex];
          if (!points) {
            return err(`No data found for exercise: ${ex}`);
          }
          return ok({ [ex]: calculateStats(points) });
        }
        const allStats: Record<string, unknown> = {};
        for (const ex of T1_EXERCISES) {
          const points = chartData[ex];
          if (points) {
            allStats[ex] = calculateStats(points);
          }
        }
        return ok(allStats);
      },
    });

    register({
      name: 'getProgress',
      description:
        'Get overall program progress: total workouts, completed count, percentage, and next workout index.',
      input: { type: 'object', properties: {} },
      execute: async (): Promise<ToolResult> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        const completed = rows.filter((r) => r.result.t1 && r.result.t2 && r.result.t3).length;
        const next = rows.find((r) => !r.result.t1 || !r.result.t2 || !r.result.t3);
        return ok({
          total: TOTAL_WORKOUTS,
          completed,
          percentage: Math.round((completed / TOTAL_WORKOUTS) * 100),
          nextWorkoutIndex: next ? next.index : null,
        });
      },
    });

    // --- Write tools ---

    register({
      name: 'logResult',
      description:
        'Log a success or fail result for a tier (t1, t2, t3) at a specific workout index. Optionally set AMRAP reps for t1 or t3.',
      input: {
        type: 'object',
        properties: {
          index: { type: 'number', description: 'Workout index (0-89)' },
          tier: { type: 'string', description: 'Tier: t1, t2, or t3' },
          result: { type: 'string', description: 'Result: success or fail' },
          amrapReps: {
            type: 'number',
            description: 'Optional AMRAP reps for t1 or t3 (0-999)',
          },
        },
        required: ['index', 'tier', 'result'],
      },
      execute: async (input: unknown): Promise<ToolResult> => {
        if (!stateRef.current.startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        if (!isRecord(input)) {
          return err('Input must be an object with index, tier, and result.');
        }
        const { index, tier, result, amrapReps } = input;
        if (!isValidIndex(index)) {
          return err('index must be an integer between 0 and 89.');
        }
        if (!isTier(tier)) {
          return err('tier must be one of: t1, t2, t3.');
        }
        if (!isResultValue(result)) {
          return err('result must be "success" or "fail".');
        }
        stateRef.current.markResult(index, tier, result);
        if (amrapReps !== undefined) {
          if (
            typeof amrapReps !== 'number' ||
            !Number.isInteger(amrapReps) ||
            amrapReps < 0 ||
            amrapReps > 999
          ) {
            return err('amrapReps must be an integer between 0 and 999.');
          }
          if (tier === 't1') {
            stateRef.current.setAmrapReps(index, 't1Reps', amrapReps);
          } else if (tier === 't3') {
            stateRef.current.setAmrapReps(index, 't3Reps', amrapReps);
          }
        }
        return ok({ logged: { index, tier, result, amrapReps: amrapReps ?? null } });
      },
    });

    register({
      name: 'undoLastResult',
      description: 'Undo the most recent result change.',
      input: { type: 'object', properties: {} },
      execute: async (): Promise<ToolResult> => {
        if (!stateRef.current.startWeights) {
          return err('No program initialized. Use initializeProgram first.');
        }
        stateRef.current.undoLast();
        return ok({ undone: true });
      },
    });

    register({
      name: 'initializeProgram',
      description:
        'Initialize the GZCLP program with starting weights (kg) for all six exercises. Only works when no program exists.',
      input: {
        type: 'object',
        properties: {
          squat: { type: 'number', description: 'Squat starting weight in kg (min 2.5)' },
          bench: { type: 'number', description: 'Bench press starting weight in kg (min 2.5)' },
          deadlift: { type: 'number', description: 'Deadlift starting weight in kg (min 2.5)' },
          ohp: { type: 'number', description: 'OHP starting weight in kg (min 2.5)' },
          latpulldown: {
            type: 'number',
            description: 'Lat pulldown starting weight in kg (min 2.5)',
          },
          dbrow: { type: 'number', description: 'DB row starting weight in kg (min 2.5)' },
        },
        required: ['squat', 'bench', 'deadlift', 'ohp', 'latpulldown', 'dbrow'],
      },
      execute: async (input: unknown): Promise<ToolResult> => {
        if (stateRef.current.startWeights) {
          return err('Program already initialized. Cannot re-initialize.');
        }
        if (!isRecord(input)) {
          return err(
            'Input must be an object with squat, bench, deadlift, ohp, latpulldown, dbrow.'
          );
        }
        const fields = ['squat', 'bench', 'deadlift', 'ohp', 'latpulldown', 'dbrow'];
        for (const ex of fields) {
          const val = input[ex];
          if (typeof val !== 'number' || val < 2.5) {
            return err(`${ex} must be a number >= 2.5.`);
          }
        }
        // All fields validated as numbers above
        const s = input.squat;
        const b = input.bench;
        const d = input.deadlift;
        const o = input.ohp;
        const lp = input.latpulldown;
        const dr = input.dbrow;
        if (
          typeof s !== 'number' ||
          typeof b !== 'number' ||
          typeof d !== 'number' ||
          typeof o !== 'number' ||
          typeof lp !== 'number' ||
          typeof dr !== 'number'
        ) {
          return err('All weights must be numbers.');
        }
        const weights: StartWeights = {
          squat: s,
          bench: b,
          deadlift: d,
          ohp: o,
          latpulldown: lp,
          dbrow: dr,
        };
        stateRef.current.generateProgram(weights);
        return ok({ initialized: true, weights });
      },
    });

    return (): void => {
      for (const unregister of unregisters) {
        unregister();
      }
    };
  }, []);
}
