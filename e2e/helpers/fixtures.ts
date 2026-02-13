/** Storage key used by the app (legacy format, auto-migrated on load). */
export const STORAGE_KEY = 'gzclp-v3';

/** Default starting weights matching the setup form defaults. */
export const DEFAULT_WEIGHTS = {
  squat: 60,
  bench: 40,
  deadlift: 60,
  ohp: 30,
  latpulldown: 30,
  dbrow: 12.5,
};

interface StoredData {
  startWeights: typeof DEFAULT_WEIGHTS;
  results: Record<string, Record<string, string | number | undefined>>;
  undoHistory: Array<{ i: number; tier: string; prev?: string }>;
}

/** Build a complete stored data object for localStorage seeding. */
export function buildStoredData(overrides: Partial<StoredData> = {}): StoredData {
  return {
    startWeights: overrides.startWeights ?? { ...DEFAULT_WEIGHTS },
    results: overrides.results ?? {},
    undoHistory: overrides.undoHistory ?? [],
  };
}

/**
 * Build a results map with `n` consecutive successful workouts.
 * Each workout has t1, t2, and t3 marked as 'success'.
 */
export function buildSuccessResults(n: number): StoredData['results'] {
  const results: StoredData['results'] = {};
  for (let i = 0; i < n; i++) {
    results[String(i)] = { t1: 'success', t2: 'success', t3: 'success' };
  }
  return results;
}
