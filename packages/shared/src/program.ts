export const DAYS = [
  { name: 'Day 1', t1: 'squat', t2: 'bench', t3: 'latpulldown' },
  { name: 'Day 2', t1: 'ohp', t2: 'deadlift', t3: 'dbrow' },
  { name: 'Day 3', t1: 'bench', t2: 'squat', t3: 'latpulldown' },
  { name: 'Day 4', t1: 'deadlift', t2: 'ohp', t3: 'dbrow' },
] as const;

export const NAMES: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  ohp: 'OHP',
  latpulldown: 'Lat Pulldown',
  dbrow: 'DB Row',
};

export const T1_STAGES = [
  { sets: 5, reps: 3 },
  { sets: 6, reps: 2 },
  { sets: 10, reps: 1 },
] as const;

export const T2_STAGES = [
  { sets: 3, reps: 10 },
  { sets: 3, reps: 8 },
  { sets: 3, reps: 6 },
] as const;

export const T1_EXERCISES = ['squat', 'bench', 'deadlift', 'ohp'] as const;

export const TOTAL_WORKOUTS = 90;

/** T2 starting weight = T1 starting weight × this multiplier */
export const T2_INITIAL_MULTIPLIER = 0.65;

/** On T1 final-stage failure, deload to weight × this multiplier */
export const T1_DELOAD_MULTIPLIER = 0.9;

/** Index of the final stage for T1 (0-based) */
export const T1_MAX_STAGE = 2;

/** Index of the final stage for T2 (0-based) */
export const T2_MAX_STAGE = 2;

/** Flat weight added on T2 final-stage failure reset */
export const T2_RESET_INCREMENT = 15;

/** T3 weight increment on success */
export const T3_INCREMENT = 2.5;

/** T3 total sets per workout */
export const T3_SETS = 3;

/** T3 prescribed reps per set */
export const T3_PRESCRIBED_REPS = 15;

export function inc(exercise: string): number {
  return exercise === 'bench' || exercise === 'ohp' ? 2.5 : 5;
}
