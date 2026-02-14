import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useWebMcp } from './use-webmcp';
import { computeProgram } from '@/lib/engine';
import { DEFAULT_WEIGHTS } from '../../test/helpers/fixtures';
import type { StartWeights, Results, WorkoutRow } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolExecuteFn = (
  input: unknown
) => Promise<{ success: boolean; data?: unknown; error?: string }>;

interface CapturedTool {
  readonly name: string;
  readonly description: string;
  readonly execute: ToolExecuteFn;
}

function buildOptions(overrides?: {
  startWeights?: StartWeights | null;
  results?: Results;
  rows?: readonly WorkoutRow[];
}): {
  startWeights: StartWeights | null;
  results: Results;
  rows: readonly WorkoutRow[];
  generateProgram: ReturnType<typeof mock>;
  markResult: ReturnType<typeof mock>;
  setAmrapReps: ReturnType<typeof mock>;
  undoLast: ReturnType<typeof mock>;
} {
  const sw = overrides?.startWeights === undefined ? DEFAULT_WEIGHTS : overrides.startWeights;
  const results = overrides?.results ?? {};
  const rows = overrides?.rows ?? (sw ? computeProgram(sw, results) : []);
  return {
    startWeights: sw,
    results,
    rows,
    generateProgram: mock(),
    markResult: mock(),
    setAmrapReps: mock(),
    undoLast: mock(),
  };
}

let capturedTools: CapturedTool[] = [];
let unregisterFns: Array<ReturnType<typeof mock>> = [];
let originalModelContext: unknown;

function installMockModelContext(): void {
  capturedTools = [];
  unregisterFns = [];
  const addTool = mock((tool: CapturedTool) => {
    capturedTools.push(tool);
    const unregister = mock();
    unregisterFns.push(unregister);
    return { unregister };
  });
  Object.defineProperty(navigator, 'modelContext', {
    value: { addTool },
    writable: true,
    configurable: true,
  });
}

function findTool(name: string): CapturedTool {
  const tool = capturedTools.find((t) => t.name === name);
  if (!tool)
    throw new Error(
      `Tool "${name}" not found among: ${capturedTools.map((t) => t.name).join(', ')}`
    );
  return tool;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWebMcp', () => {
  beforeEach(() => {
    originalModelContext = (navigator as unknown as Record<string, unknown>).modelContext;
  });

  afterEach(() => {
    if (originalModelContext === undefined) {
      delete (navigator as unknown as Record<string, unknown>).modelContext;
    } else {
      Object.defineProperty(navigator, 'modelContext', {
        value: originalModelContext,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('feature detection', () => {
    it('should not throw when navigator.modelContext is undefined', () => {
      delete (navigator as unknown as Record<string, unknown>).modelContext;
      const opts = buildOptions();
      expect(() => renderHook(() => useWebMcp(opts))).not.toThrow();
    });
  });

  describe('tool registration', () => {
    it('should register all 7 tools', () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      expect(capturedTools).toHaveLength(7);
      const names = capturedTools.map((t) => t.name);
      expect(names).toContain('getCurrentWorkout');
      expect(names).toContain('getProgram');
      expect(names).toContain('getStats');
      expect(names).toContain('getProgress');
      expect(names).toContain('logResult');
      expect(names).toContain('undoLastResult');
      expect(names).toContain('initializeProgram');
    });

    it('should unregister all tools on unmount', () => {
      installMockModelContext();
      const opts = buildOptions();
      const { unmount } = renderHook(() => useWebMcp(opts));

      unmount();

      for (const fn of unregisterFns) {
        expect(fn).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('getCurrentWorkout', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getCurrentWorkout').execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No program initialized');
    });

    it('should return the first incomplete workout', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getCurrentWorkout').execute({});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.index).toBe(0);
      expect(data.dayName).toBe('Day 1');
    });

    it('should return completed message when all workouts are done', async () => {
      installMockModelContext();
      const results: Results = {};
      for (let i = 0; i < 90; i++) {
        results[i] = { t1: 'success', t2: 'success', t3: 'success' };
      }
      const opts = buildOptions({ results });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getCurrentWorkout').execute({});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.completed).toBe(true);
    });
  });

  describe('getProgram', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgram').execute({});

      expect(result.success).toBe(false);
    });

    it('should return all 90 rows by default', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgram').execute({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(90);
    });

    it('should return a range when startIndex and endIndex are provided', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgram').execute({ startIndex: 0, endIndex: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should return error for invalid startIndex', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgram').execute({ startIndex: -1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('startIndex');
    });

    it('should return error when startIndex > endIndex', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgram').execute({ startIndex: 5, endIndex: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('startIndex must be <= endIndex');
    });
  });

  describe('getStats', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getStats').execute({});

      expect(result.success).toBe(false);
    });

    it('should return stats for all exercises when no exercise specified', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getStats').execute({});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data).toHaveProperty('squat');
      expect(data).toHaveProperty('bench');
      expect(data).toHaveProperty('deadlift');
      expect(data).toHaveProperty('ohp');
    });

    it('should return stats for a single exercise', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getStats').execute({ exercise: 'squat' });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data).toHaveProperty('squat');
      expect(data).not.toHaveProperty('bench');
    });

    it('should return error for invalid exercise', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getStats').execute({ exercise: 'curl' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid exercise');
    });
  });

  describe('getProgress', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgress').execute({});

      expect(result.success).toBe(false);
    });

    it('should return correct progress for a fresh program', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('getProgress').execute({});

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.total).toBe(90);
      expect(data.completed).toBe(0);
      expect(data.percentage).toBe(0);
      expect(data.nextWorkoutIndex).toBe(0);
    });
  });

  describe('logResult', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({
        index: 0,
        tier: 't1',
        result: 'success',
      });

      expect(result.success).toBe(false);
    });

    it('should call markResult with validated input', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({
        index: 0,
        tier: 't1',
        result: 'success',
      });

      expect(result.success).toBe(true);
      expect(opts.markResult).toHaveBeenCalledWith(0, 't1', 'success');
    });

    it('should call setAmrapReps when amrapReps is provided for t1', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      await findTool('logResult').execute({
        index: 0,
        tier: 't1',
        result: 'success',
        amrapReps: 8,
      });

      expect(opts.setAmrapReps).toHaveBeenCalledWith(0, 't1Reps', 8);
    });

    it('should call setAmrapReps when amrapReps is provided for t3', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      await findTool('logResult').execute({
        index: 0,
        tier: 't3',
        result: 'success',
        amrapReps: 25,
      });

      expect(opts.setAmrapReps).toHaveBeenCalledWith(0, 't3Reps', 25);
    });

    it('should return error for invalid tier', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({
        index: 0,
        tier: 't4',
        result: 'success',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tier');
    });

    it('should return error for invalid result value', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({ index: 0, tier: 't1', result: 'maybe' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('result');
    });

    it('should return error for out-of-range index', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({
        index: 90,
        tier: 't1',
        result: 'success',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('index');
    });

    it('should return error for non-object input', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute('not an object');

      expect(result.success).toBe(false);
    });

    it('should return error for invalid amrapReps', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('logResult').execute({
        index: 0,
        tier: 't1',
        result: 'success',
        amrapReps: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('amrapReps');
    });
  });

  describe('undoLastResult', () => {
    it('should return error when no program initialized', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('undoLastResult').execute({});

      expect(result.success).toBe(false);
    });

    it('should call undoLast', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('undoLastResult').execute({});

      expect(result.success).toBe(true);
      expect(opts.undoLast).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeProgram', () => {
    it('should return error when program already exists', async () => {
      installMockModelContext();
      const opts = buildOptions();
      renderHook(() => useWebMcp(opts));

      const result = await findTool('initializeProgram').execute(DEFAULT_WEIGHTS);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already initialized');
    });

    it('should call generateProgram with valid weights', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('initializeProgram').execute(DEFAULT_WEIGHTS);

      expect(result.success).toBe(true);
      expect(opts.generateProgram).toHaveBeenCalledWith(DEFAULT_WEIGHTS);
    });

    it('should return error for missing weight field', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('initializeProgram').execute({
        squat: 60,
        bench: 40,
        deadlift: 80,
        ohp: 25,
        latpulldown: 30,
        // missing dbrow
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('dbrow');
    });

    it('should return error for weight below minimum', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('initializeProgram').execute({
        squat: 1,
        bench: 40,
        deadlift: 80,
        ohp: 25,
        latpulldown: 30,
        dbrow: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('squat');
    });

    it('should return error for non-object input', async () => {
      installMockModelContext();
      const opts = buildOptions({ startWeights: null });
      renderHook(() => useWebMcp(opts));

      const result = await findTool('initializeProgram').execute('not an object');

      expect(result.success).toBe(false);
    });
  });
});
