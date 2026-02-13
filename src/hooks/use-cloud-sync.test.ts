import { mock, describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { buildStoredData } from '../../test/helpers/fixtures';
import { loadSyncMeta } from '@/lib/sync';

// ---------------------------------------------------------------------------
// Mock Supabase client — supports the three PostgREST query chains used by
// fetchCloudData (.select .eq .maybeSingle), pushToCloud (.upsert .select
// .single), and deleteCloudData (.delete .eq).
// ---------------------------------------------------------------------------

interface MockSupabaseConfig {
  /** Row returned by .maybeSingle() — fetchCloudData */
  readonly fetchRow?: { data: unknown; updated_at: string } | null;
  readonly fetchError?: { message: string } | null;
  /** Row returned by .single() — pushToCloud */
  readonly pushRow?: { updated_at: string } | null;
  readonly pushError?: { message: string } | null;
  /** Error from delete */
  readonly deleteError?: { message: string } | null;
}

function createMockSupabase(config: MockSupabaseConfig = {}): unknown {
  return {
    from: (): Record<string, unknown> => {
      let op: 'fetch' | 'push' | 'delete' = 'fetch';
      const builder: Record<string, unknown> = {};

      builder.select = (): Record<string, unknown> => builder;
      builder.eq = (): unknown => {
        if (op === 'delete') {
          return Promise.resolve({ error: config.deleteError ?? null });
        }
        return builder;
      };
      builder.upsert = (): Record<string, unknown> => {
        op = 'push';
        return builder;
      };
      builder.delete = (): Record<string, unknown> => {
        op = 'delete';
        return builder;
      };
      builder.maybeSingle = (): Promise<unknown> =>
        Promise.resolve({
          data: config.fetchRow ?? null,
          error: config.fetchError ?? null,
        });
      builder.single = (): Promise<unknown> =>
        Promise.resolve({
          data: config.pushRow ?? null,
          error: config.pushError ?? null,
        });

      return builder;
    },
  };
}

// ---------------------------------------------------------------------------
// Module mock — only mock @/lib/supabase (no test file tests it directly).
// Real @/lib/sync and @/lib/storage functions remain untouched.
// ---------------------------------------------------------------------------

let currentClient: unknown = createMockSupabase();

mock.module('@/lib/supabase', () => ({
  getSupabaseClient: (): unknown => currentClient,
}));

import { useCloudSync } from './use-cloud-sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { id: 'user-1' } as User;
const localData = buildStoredData();
const cloudData = buildStoredData({ startWeights: { squat: 100 } });

function defaultOptions(
  overrides?: Partial<Parameters<typeof useCloudSync>[0]>
): Parameters<typeof useCloudSync>[0] {
  return {
    user: null,
    startWeights: localData.startWeights,
    results: localData.results,
    undoHistory: localData.undoHistory,
    onCloudDataReceived: mock(() => {}),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCloudSync', () => {
  beforeEach(() => {
    currentClient = createMockSupabase();
  });

  // -------------------------------------------------------------------------
  // Without user
  // -------------------------------------------------------------------------
  describe('without user', () => {
    it('should return idle status', () => {
      const { result } = renderHook(() => useCloudSync(defaultOptions()));

      expect(result.current.syncStatus).toBe('idle');
    });

    it('should return null conflict', () => {
      const { result } = renderHook(() => useCloudSync(defaultOptions()));

      expect(result.current.conflict).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Initial sync
  // -------------------------------------------------------------------------
  describe('initial sync', () => {
    it('should reach synced status when no cloud data and local data gets pushed', async () => {
      // No cloud data → determineInitialSync returns 'push' → pushToCloud runs
      currentClient = createMockSupabase({
        fetchRow: null,
        pushRow: { updated_at: '2025-01-15T12:00:00Z' },
      });

      const { result } = renderHook(() => useCloudSync(defaultOptions({ user: fakeUser })));

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced');
      });

      // pushToCloud called markSynced, so sync meta should have lastSyncedAt
      const meta = loadSyncMeta();
      expect(meta?.lastSyncedAt).toBeTruthy();
    });

    it('should call onCloudDataReceived on pull when no local data', async () => {
      // Cloud has data, no local data → pull
      currentClient = createMockSupabase({
        fetchRow: { data: cloudData, updated_at: '2025-01-15T12:00:00Z' },
      });

      const onCloudDataReceived = mock(() => {});
      const { result } = renderHook(() =>
        useCloudSync(
          defaultOptions({
            user: fakeUser,
            startWeights: null,
            results: {},
            undoHistory: [],
            onCloudDataReceived,
          })
        )
      );

      await waitFor(() => {
        expect(onCloudDataReceived).toHaveBeenCalled();
      });

      expect(result.current.syncStatus).toBe('synced');
    });

    it('should expose conflict when both local and cloud data exist without sync history', async () => {
      // Both sides have data, no sync meta → conflict
      currentClient = createMockSupabase({
        fetchRow: { data: cloudData, updated_at: '2025-01-15T12:00:00Z' },
      });

      const { result } = renderHook(() => useCloudSync(defaultOptions({ user: fakeUser })));

      await waitFor(() => {
        expect(result.current.conflict).not.toBeNull();
      });

      expect(result.current.conflict?.cloudData).toEqual(cloudData);
      expect(result.current.conflict?.cloudUpdatedAt).toBe('2025-01-15T12:00:00Z');
    });

    it('should surface error when Supabase client is unavailable', async () => {
      currentClient = null;

      const { result } = renderHook(() => useCloudSync(defaultOptions({ user: fakeUser })));

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('error');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Conflict resolution
  // -------------------------------------------------------------------------
  describe('resolveConflict', () => {
    it('should apply cloud data when choosing cloud', async () => {
      currentClient = createMockSupabase({
        fetchRow: { data: cloudData, updated_at: '2025-01-15T12:00:00Z' },
      });

      const onCloudDataReceived = mock(() => {});
      const { result } = renderHook(() =>
        useCloudSync(defaultOptions({ user: fakeUser, onCloudDataReceived }))
      );

      await waitFor(() => {
        expect(result.current.conflict).not.toBeNull();
      });

      act(() => {
        result.current.resolveConflict('cloud');
      });

      expect(onCloudDataReceived).toHaveBeenCalledWith(cloudData);
      await waitFor(() => {
        expect(result.current.conflict).toBeNull();
      });
    });

    it('should push local data when choosing local', async () => {
      currentClient = createMockSupabase({
        fetchRow: { data: cloudData, updated_at: '2025-01-15T12:00:00Z' },
        pushRow: { updated_at: '2025-01-16T00:00:00Z' },
      });

      const { result } = renderHook(() => useCloudSync(defaultOptions({ user: fakeUser })));

      await waitFor(() => {
        expect(result.current.conflict).not.toBeNull();
      });

      act(() => {
        result.current.resolveConflict('local');
      });

      // After resolving local, hook should push and eventually reach synced
      await waitFor(() => {
        expect(result.current.conflict).toBeNull();
        expect(result.current.syncStatus).toBe('synced');
      });
    });
  });

  // -------------------------------------------------------------------------
  // clearCloudData
  // -------------------------------------------------------------------------
  describe('clearCloudData', () => {
    it('should delete cloud data and clear sync meta', async () => {
      currentClient = createMockSupabase({
        fetchRow: null,
        pushRow: { updated_at: '2025-01-15T12:00:00Z' },
      });

      const { result } = renderHook(() => useCloudSync(defaultOptions({ user: fakeUser })));

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced');
      });

      await act(async () => {
        await result.current.clearCloudData();
      });

      // clearSyncMeta should have cleared the metadata
      expect(loadSyncMeta()).toBeNull();
    });

    it('should be no-op without user', async () => {
      // Seed some sync meta to verify it's NOT cleared
      localStorage.setItem(
        'gzclp-sync-meta',
        JSON.stringify({ lastSyncedAt: 'x', localUpdatedAt: 'y' })
      );

      const { result } = renderHook(() => useCloudSync(defaultOptions()));

      await act(async () => {
        await result.current.clearCloudData();
      });

      // Sync meta should still be there (not cleared)
      expect(loadSyncMeta()).not.toBeNull();
    });
  });
});
