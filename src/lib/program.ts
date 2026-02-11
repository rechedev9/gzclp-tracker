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

export const TOTAL_WORKOUTS = 90;
export const TOTAL_WEEKS = 30;

export function inc(exercise: string): number {
  return exercise === 'bench' || exercise === 'ohp' ? 2.5 : 5;
}
