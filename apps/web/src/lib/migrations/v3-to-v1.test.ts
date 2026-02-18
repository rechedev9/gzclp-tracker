import { describe, it, expect } from 'bun:test';
import { convertResultsToLegacy, convertUndoToLegacy } from './v3-to-v1';
import type { GenericResults, GenericUndoHistory } from '@gzclp/shared/types/program';

// ---------------------------------------------------------------------------
// convertResultsToLegacy: slot-keyed → tier-keyed
// ---------------------------------------------------------------------------
describe('convertResultsToLegacy', () => {
  it('should return empty results for empty input', () => {
    expect(convertResultsToLegacy({})).toEqual({});
  });

  it('should map d1-t1/d1-t2/d1-t3 to t1/t2/t3 for Day 1', () => {
    const generic: GenericResults = {
      '0': {
        'd1-t1': { result: 'success' },
        'd1-t2': { result: 'fail' },
        'd1-t3': { result: 'success' },
      },
    };
    const legacy = convertResultsToLegacy(generic);

    expect(legacy['0']?.t1).toBe('success');
    expect(legacy['0']?.t2).toBe('fail');
    expect(legacy['0']?.t3).toBe('success');
  });

  it('should map d2-t1/d2-t2/d2-t3 for Day 2 (workoutIndex 1)', () => {
    const generic: GenericResults = {
      '1': {
        'd2-t1': { result: 'fail' },
        'd2-t2': { result: 'success' },
      },
    };
    const legacy = convertResultsToLegacy(generic);

    expect(legacy['1']?.t1).toBe('fail');
    expect(legacy['1']?.t2).toBe('success');
    expect(legacy['1']?.t3).toBeUndefined();
  });

  it('should preserve AMRAP reps for t1 and t3', () => {
    const generic: GenericResults = {
      '0': {
        'd1-t1': { result: 'success', amrapReps: 12 },
        'd1-t3': { result: 'success', amrapReps: 25 },
      },
    };
    const legacy = convertResultsToLegacy(generic);

    expect(legacy['0']?.t1Reps).toBe(12);
    expect(legacy['0']?.t3Reps).toBe(25);
  });

  it('should skip entries with unknown slot IDs', () => {
    const generic: GenericResults = {
      '0': {
        'unknown-slot': { result: 'success' },
        'd1-t1': { result: 'fail' },
      },
    };
    const legacy = convertResultsToLegacy(generic);

    expect(legacy['0']?.t1).toBe('fail');
    expect(Object.keys(legacy['0'] ?? {})).not.toContain('unknown-slot');
  });

  it('should handle sparse results across multiple workout indices', () => {
    const generic: GenericResults = {
      '0': { 'd1-t1': { result: 'success' } },
      '50': { 'd3-t2': { result: 'fail' } },
      '89': { 'd2-t3': { result: 'success' } },
    };
    const legacy = convertResultsToLegacy(generic);

    expect(legacy['0']?.t1).toBe('success');
    expect(legacy['50']?.t2).toBe('fail');
    expect(legacy['89']?.t3).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// convertUndoToLegacy: slot-keyed undo → tier-keyed undo
// ---------------------------------------------------------------------------
describe('convertUndoToLegacy', () => {
  it('should return empty array for empty input', () => {
    expect(convertUndoToLegacy([])).toEqual([]);
  });

  it('should convert slot IDs to tiers', () => {
    const generic: GenericUndoHistory = [
      { i: 0, slotId: 'd1-t1', prev: 'success' },
      { i: 1, slotId: 'd2-t2', prev: 'fail' },
    ];
    const legacy = convertUndoToLegacy(generic);

    expect(legacy[0]).toEqual({ i: 0, tier: 't1', prev: 'success' });
    expect(legacy[1]).toEqual({ i: 1, tier: 't2', prev: 'fail' });
  });

  it('should handle entries without prev value', () => {
    const generic: GenericUndoHistory = [{ i: 0, slotId: 'd1-t3' }];
    const legacy = convertUndoToLegacy(generic);

    expect(legacy[0]).toEqual({ i: 0, tier: 't3', prev: undefined });
  });

  it('should preserve workout index', () => {
    const generic: GenericUndoHistory = [
      { i: 45, slotId: 'd2-t1', prev: 'fail' },
      { i: 89, slotId: 'd4-t2', prev: 'success' },
    ];
    const legacy = convertUndoToLegacy(generic);

    expect(legacy[0]?.i).toBe(45);
    expect(legacy[1]?.i).toBe(89);
  });

  it('should skip entries with unknown slot IDs', () => {
    const generic: GenericUndoHistory = [
      { i: 0, slotId: 'unknown-slot', prev: 'success' },
      { i: 1, slotId: 'd1-t1', prev: 'fail' },
    ];
    const legacy = convertUndoToLegacy(generic);

    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.tier).toBe('t1');
  });
});
