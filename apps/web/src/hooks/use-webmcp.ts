import { useEffect, useRef } from 'react';
import type { StartWeights, Results, WorkoutRow, ResultValue, Tier } from '@gzclp/shared/types';
import { TOTAL_WORKOUTS, T1_EXERCISES, NAMES } from '@gzclp/shared/program';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import { isRecord } from '@gzclp/shared/type-guards';
import { buildGoogleCalendarUrl } from '@/lib/calendar';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textResponse(data: unknown): ModelContextToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function errorResponse(error: string): ModelContextToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify({ error }) }] };
}

function findNextIncomplete(rows: readonly WorkoutRow[]): WorkoutRow | undefined {
  return rows.find((r) => !r.result.t1 || !r.result.t2 || !r.result.t3);
}

const VALID_EXERCISES = new Set<string>(T1_EXERCISES);
const EXERCISE_FIELDS = ['squat', 'bench', 'deadlift', 'ohp', 'latpulldown', 'dbrow'] as const;
const NO_PROGRAM = 'No program initialized. Use initializeProgram first.';

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

// ---------------------------------------------------------------------------
// Tool name constants (used for registerTool / unregisterTool)
// ---------------------------------------------------------------------------

const TOOL_NAMES = [
  'getCurrentWorkout',
  'getProgram',
  'getStats',
  'getProgress',
  'logResult',
  'undoLastResult',
  'initializeProgram',
  'scheduleNextWorkout',
] as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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

    // --- Read-only tools ---

    mc.registerTool({
      name: 'getCurrentWorkout',
      description:
        'Get the next incomplete workout in the GZCLP program. Returns the workout details including exercises, weights, sets, reps, and any partial results.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async (): Promise<ModelContextToolResponse> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) return errorResponse(NO_PROGRAM);
        const current = findNextIncomplete(rows);
        if (!current) {
          return textResponse({ message: 'All 90 workouts completed!', completed: true });
        }
        return textResponse({
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

    mc.registerTool({
      name: 'getProgram',
      description:
        'Get workout rows from the GZCLP program. Optionally pass startIndex and endIndex (0-89) to get a range. Returns all 90 rows by default.',
      inputSchema: {
        type: 'object',
        properties: {
          startIndex: { type: 'number', description: 'First workout index (0-89), default 0' },
          endIndex: { type: 'number', description: 'Last workout index (0-89), default 89' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input: unknown): Promise<ModelContextToolResponse> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) return errorResponse(NO_PROGRAM);
        let start = 0;
        let end = TOTAL_WORKOUTS - 1;
        if (isRecord(input)) {
          if (input.startIndex !== undefined) {
            if (!isValidIndex(input.startIndex)) {
              return errorResponse('startIndex must be an integer between 0 and 89.');
            }
            start = input.startIndex;
          }
          if (input.endIndex !== undefined) {
            if (!isValidIndex(input.endIndex)) {
              return errorResponse('endIndex must be an integer between 0 and 89.');
            }
            end = input.endIndex;
          }
        }
        if (start > end) {
          return errorResponse('startIndex must be <= endIndex.');
        }
        const slice = rows.slice(start, end + 1).map((r) => ({
          index: r.index,
          dayName: r.dayName,
          t1: { exercise: NAMES[r.t1Exercise], weight: r.t1Weight, stage: r.t1Stage + 1 },
          t2: { exercise: NAMES[r.t2Exercise], weight: r.t2Weight, stage: r.t2Stage + 1 },
          t3: { exercise: NAMES[r.t3Exercise], weight: r.t3Weight },
          completed: Boolean(r.result.t1 && r.result.t2 && r.result.t3),
        }));
        return textResponse(slice);
      },
    });

    mc.registerTool({
      name: 'getStats',
      description:
        'Get performance statistics for one or all T1 exercises (squat, bench, deadlift, ohp). Includes success rate, current weight, weight gained, and current stage.',
      inputSchema: {
        type: 'object',
        properties: {
          exercise: {
            type: 'string',
            description: 'Exercise name: squat, bench, deadlift, or ohp. Omit for all.',
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input: unknown): Promise<ModelContextToolResponse> => {
        const { startWeights } = stateRef.current;
        if (!startWeights) return errorResponse(NO_PROGRAM);
        const chartData = extractChartData(startWeights, stateRef.current.results);
        if (isRecord(input) && typeof input.exercise === 'string') {
          const ex = input.exercise.toLowerCase();
          if (!VALID_EXERCISES.has(ex)) {
            return errorResponse(`Invalid exercise. Must be one of: ${T1_EXERCISES.join(', ')}`);
          }
          const points = chartData[ex];
          if (!points) {
            return errorResponse(`No data found for exercise: ${ex}`);
          }
          return textResponse({ [ex]: calculateStats(points) });
        }
        const allStats: Record<string, unknown> = {};
        for (const ex of T1_EXERCISES) {
          const points = chartData[ex];
          if (points) {
            allStats[ex] = calculateStats(points);
          }
        }
        return textResponse(allStats);
      },
    });

    mc.registerTool({
      name: 'getProgress',
      description:
        'Get overall program progress: total workouts, completed count, percentage, and next workout index.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async (): Promise<ModelContextToolResponse> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) return errorResponse(NO_PROGRAM);
        const completed = rows.filter((r) => r.result.t1 && r.result.t2 && r.result.t3).length;
        const next = findNextIncomplete(rows);
        return textResponse({
          total: TOTAL_WORKOUTS,
          completed,
          percentage: Math.round((completed / TOTAL_WORKOUTS) * 100),
          nextWorkoutIndex: next ? next.index : null,
        });
      },
    });

    // --- Write tools ---

    mc.registerTool({
      name: 'logResult',
      description:
        'Log a success or fail result for a tier (t1, t2, t3) at a specific workout index. Optionally set AMRAP reps for t1 or t3.',
      inputSchema: {
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
      execute: async (input: unknown): Promise<ModelContextToolResponse> => {
        if (!stateRef.current.startWeights) return errorResponse(NO_PROGRAM);
        if (!isRecord(input)) {
          return errorResponse('Input must be an object with index, tier, and result.');
        }
        const { index, tier, result, amrapReps } = input;
        if (!isValidIndex(index)) {
          return errorResponse('index must be an integer between 0 and 89.');
        }
        if (!isTier(tier)) {
          return errorResponse('tier must be one of: t1, t2, t3.');
        }
        if (!isResultValue(result)) {
          return errorResponse('result must be "success" or "fail".');
        }
        stateRef.current.markResult(index, tier, result);
        if (amrapReps !== undefined) {
          if (
            typeof amrapReps !== 'number' ||
            !Number.isInteger(amrapReps) ||
            amrapReps < 0 ||
            amrapReps > 999
          ) {
            return errorResponse('amrapReps must be an integer between 0 and 999.');
          }
          if (tier === 't1') {
            stateRef.current.setAmrapReps(index, 't1Reps', amrapReps);
          } else if (tier === 't3') {
            stateRef.current.setAmrapReps(index, 't3Reps', amrapReps);
          }
        }
        return textResponse({ logged: { index, tier, result, amrapReps: amrapReps ?? null } });
      },
    });

    mc.registerTool({
      name: 'undoLastResult',
      description: 'Undo the most recent result change.',
      inputSchema: { type: 'object', properties: {} },
      execute: async (): Promise<ModelContextToolResponse> => {
        if (!stateRef.current.startWeights) return errorResponse(NO_PROGRAM);
        stateRef.current.undoLast();
        return textResponse({ undone: true });
      },
    });

    mc.registerTool({
      name: 'initializeProgram',
      description:
        'Initialize the GZCLP program with starting weights (kg) for all six exercises. Only works when no program exists.',
      inputSchema: {
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
      execute: async (input: unknown): Promise<ModelContextToolResponse> => {
        if (stateRef.current.startWeights) {
          return errorResponse('Program already initialized. Cannot re-initialize.');
        }
        if (!isRecord(input)) {
          return errorResponse(
            'Input must be an object with squat, bench, deadlift, ohp, latpulldown, dbrow.'
          );
        }
        const validated: Record<string, number> = {};
        for (const field of EXERCISE_FIELDS) {
          const val = input[field];
          if (typeof val !== 'number' || val < 2.5) {
            return errorResponse(`${field} must be a number >= 2.5.`);
          }
          validated[field] = val;
        }
        const weights: StartWeights = {
          squat: validated.squat,
          bench: validated.bench,
          deadlift: validated.deadlift,
          ohp: validated.ohp,
          latpulldown: validated.latpulldown,
          dbrow: validated.dbrow,
        };
        stateRef.current.generateProgram(weights);
        return textResponse({ initialized: true, weights });
      },
    });

    mc.registerTool({
      name: 'scheduleNextWorkout',
      description:
        'Generate a Google Calendar URL to schedule a GZCLP workout. Opens a pre-filled event creation page — no OAuth or API keys needed.',
      inputSchema: {
        type: 'object',
        properties: {
          workoutIndex: {
            type: 'number',
            description: 'Workout index (0-89). Defaults to the next incomplete workout.',
          },
          date: {
            type: 'string',
            description: 'ISO date string (e.g. "2026-02-15"). Defaults to tomorrow.',
          },
          startHour: {
            type: 'number',
            description: 'Start hour 0-23. Defaults to 7.',
          },
          durationMinutes: {
            type: 'number',
            description: 'Duration in minutes (1-480). Defaults to 60.',
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input: unknown): Promise<ModelContextToolResponse> => {
        const { rows, startWeights } = stateRef.current;
        if (!startWeights) return errorResponse(NO_PROGRAM);

        let workoutIndex: number | undefined;
        let date: string | undefined;
        let startHour: number | undefined;
        let durationMinutes: number | undefined;

        if (isRecord(input)) {
          if (input.workoutIndex !== undefined) {
            if (!isValidIndex(input.workoutIndex)) {
              return errorResponse('workoutIndex must be an integer between 0 and 89.');
            }
            workoutIndex = input.workoutIndex;
          }
          if (input.date !== undefined) {
            if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
              return errorResponse('date must be a valid ISO date string (YYYY-MM-DD).');
            }
            const parsed = new Date(input.date + 'T00:00:00');
            if (Number.isNaN(parsed.getTime())) {
              return errorResponse('date must be a valid ISO date string (YYYY-MM-DD).');
            }
            date = input.date;
          }
          if (input.startHour !== undefined) {
            if (
              typeof input.startHour !== 'number' ||
              !Number.isInteger(input.startHour) ||
              input.startHour < 0 ||
              input.startHour > 23
            ) {
              return errorResponse('startHour must be an integer between 0 and 23.');
            }
            startHour = input.startHour;
          }
          if (input.durationMinutes !== undefined) {
            if (
              typeof input.durationMinutes !== 'number' ||
              !Number.isInteger(input.durationMinutes) ||
              input.durationMinutes < 1 ||
              input.durationMinutes > 480
            ) {
              return errorResponse('durationMinutes must be an integer between 1 and 480.');
            }
            durationMinutes = input.durationMinutes;
          }
        }

        if (workoutIndex === undefined) {
          const next = findNextIncomplete(rows);
          if (!next) {
            return errorResponse('All 90 workouts completed. No workout to schedule.');
          }
          workoutIndex = next.index;
        }

        const row = rows[workoutIndex];
        if (!row) {
          return errorResponse('workoutIndex must be an integer between 0 and 89.');
        }

        const event = buildGoogleCalendarUrl(row, { date, startHour, durationMinutes });

        return textResponse({
          calendarUrl: event.calendarUrl,
          title: event.title,
          workoutIndex,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
        });
      },
    });

    return (): void => {
      for (const name of TOOL_NAMES) {
        mc.unregisterTool(name);
      }
    };
  }, []);
}
