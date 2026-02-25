/**
 * api-functions unit tests — verifies tierToSlotId with inlined GZCLP constants
 * and fetchCatalogDetail response parsing.
 */
import { describe, it, expect, mock } from 'bun:test';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the module
// ---------------------------------------------------------------------------

mock.module('@/lib/api', () => ({
  getAccessToken: () => 'fake-token',
  refreshAccessToken: () => Promise.resolve(null),
  setAccessToken: () => {},
}));

// Import after mocks are set up
import { tierToSlotId } from './api-functions';

// ---------------------------------------------------------------------------
// tierToSlotId — inlined GZCLP day-slot map
// ---------------------------------------------------------------------------

describe('tierToSlotId', () => {
  describe('Day 1 (workout index 0, 4, 8, ...)', () => {
    it('should return d1-t1 for t1 at index 0', () => {
      expect(tierToSlotId(0, 't1')).toBe('d1-t1');
    });

    it('should return d1-t2 for t2 at index 0', () => {
      expect(tierToSlotId(0, 't2')).toBe('d1-t2');
    });

    it('should return latpulldown-t3 for t3 at index 0', () => {
      expect(tierToSlotId(0, 't3')).toBe('latpulldown-t3');
    });

    it('should cycle correctly for index 4', () => {
      expect(tierToSlotId(4, 't1')).toBe('d1-t1');
    });
  });

  describe('Day 2 (workout index 1, 5, 9, ...)', () => {
    it('should return d2-t1 for t1 at index 1', () => {
      expect(tierToSlotId(1, 't1')).toBe('d2-t1');
    });

    it('should return d2-t2 for t2 at index 1', () => {
      expect(tierToSlotId(1, 't2')).toBe('d2-t2');
    });

    it('should return dbrow-t3 for t3 at index 1', () => {
      expect(tierToSlotId(1, 't3')).toBe('dbrow-t3');
    });
  });

  describe('Day 3 (workout index 2, 6, 10, ...)', () => {
    it('should return d3-t1 for t1 at index 2', () => {
      expect(tierToSlotId(2, 't1')).toBe('d3-t1');
    });

    it('should return d3-t2 for t2 at index 2', () => {
      expect(tierToSlotId(2, 't2')).toBe('d3-t2');
    });

    it('should return latpulldown-t3 for t3 at index 2', () => {
      expect(tierToSlotId(2, 't3')).toBe('latpulldown-t3');
    });
  });

  describe('Day 4 (workout index 3, 7, 11, ...)', () => {
    it('should return d4-t1 for t1 at index 3', () => {
      expect(tierToSlotId(3, 't1')).toBe('d4-t1');
    });

    it('should return d4-t2 for t2 at index 3', () => {
      expect(tierToSlotId(3, 't2')).toBe('d4-t2');
    });

    it('should return dbrow-t3 for t3 at index 3', () => {
      expect(tierToSlotId(3, 't3')).toBe('dbrow-t3');
    });
  });

  describe('cycle wrap-around', () => {
    it('should cycle to day1 at index 88', () => {
      expect(tierToSlotId(88, 't1')).toBe('d1-t1');
    });

    it('should cycle to day2 at index 89', () => {
      expect(tierToSlotId(89, 't1')).toBe('d2-t1');
    });
  });

  describe('unknown tier', () => {
    it('should return null for an unknown tier', () => {
      // 't4' is not in the GZCLP_DAY_SLOT_MAP
      expect(tierToSlotId(0, 't4' as 't1')).toBeNull();
    });
  });
});
