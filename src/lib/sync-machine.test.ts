import { describe, it, expect } from 'bun:test';
import {
  syncReducer,
  deriveSyncStatus,
  deriveConflict,
  retryDelay,
  INITIAL_SYNC_STATE,
  MAX_RETRIES,
  type SyncState,
  type SyncAction,
} from './sync-machine';
import { buildStoredData } from '../../test/helpers/fixtures';
import type { InitialSyncResult } from './sync';

// --- Helpers ---

/** Apply a sequence of actions to a state. */
function dispatch(state: SyncState, ...actions: readonly SyncAction[]): SyncState {
  return actions.reduce(syncReducer, state);
}

/** Common starting state: logged-in user, initial sync completed. */
function loggedIn(overrides?: Partial<SyncState>): SyncState {
  return {
    ...INITIAL_SYNC_STATE,
    userId: 'user-1',
    isOnline: true,
    initialSyncDone: true,
    ...overrides,
  };
}

const cloudData = buildStoredData({ startWeights: { squat: 100 } });

// ---------------------------------------------------------------------------
// USER_CHANGED
// ---------------------------------------------------------------------------
describe('USER_CHANGED', () => {
  it('should reset to idle on logout', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'USER_CHANGED', userId: null });

    expect(next.userId).toBeNull();
    expect(next.phase.tag).toBe('idle');
    expect(next.initialSyncDone).toBe(false);
  });

  it('should preserve isOnline on logout', () => {
    const state = loggedIn({ isOnline: false });
    const next = syncReducer(state, { type: 'USER_CHANGED', userId: null });

    expect(next.isOnline).toBe(false);
  });

  it('should start initial sync on new user login when online', () => {
    const next = syncReducer(INITIAL_SYNC_STATE, { type: 'USER_CHANGED', userId: 'user-1' });

    expect(next.userId).toBe('user-1');
    expect(next.phase.tag).toBe('initial-sync');
    expect(next.initialSyncDone).toBe(false);
  });

  it('should stay idle on new user login when offline', () => {
    const state: SyncState = { ...INITIAL_SYNC_STATE, isOnline: false };
    const next = syncReducer(state, { type: 'USER_CHANGED', userId: 'user-1' });

    expect(next.phase.tag).toBe('idle');
    expect(next.userId).toBe('user-1');
  });

  it('should be no-op for same user when already synced', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'USER_CHANGED', userId: 'user-1' });

    expect(next).toBe(state); // Reference equality — no change
  });

  it('should reset and restart sync when switching users (bug fix #2)', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'USER_CHANGED', userId: 'user-2' });

    expect(next.userId).toBe('user-2');
    expect(next.phase.tag).toBe('initial-sync');
    expect(next.initialSyncDone).toBe(false);
    expect(next.hasPendingChanges).toBe(false);
    expect(next.retryCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// WENT_ONLINE / WENT_OFFLINE
// ---------------------------------------------------------------------------
describe('WENT_ONLINE', () => {
  it('should start initial sync if not done yet', () => {
    const state: SyncState = { ...INITIAL_SYNC_STATE, userId: 'user-1', isOnline: false };
    const next = syncReducer(state, { type: 'WENT_ONLINE' });

    expect(next.isOnline).toBe(true);
    expect(next.phase.tag).toBe('initial-sync');
  });

  it('should start debouncing if there are pending changes', () => {
    const state = loggedIn({ isOnline: false, hasPendingChanges: true, phase: { tag: 'idle' } });
    const next = syncReducer(state, { type: 'WENT_ONLINE' });

    expect(next.phase.tag).toBe('debouncing');
    expect(next.hasPendingChanges).toBe(true);
  });

  it('should start debouncing if in error state', () => {
    const state = loggedIn({
      isOnline: false,
      phase: { tag: 'error', retryable: true, retryTarget: 'push' },
    });
    const next = syncReducer(state, { type: 'WENT_ONLINE' });

    expect(next.phase.tag).toBe('debouncing');
  });

  it('should stay synced if no pending work', () => {
    const state = loggedIn({ isOnline: false, phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'WENT_ONLINE' });

    expect(next.phase.tag).toBe('synced');
    expect(next.isOnline).toBe(true);
  });

  it('should be no-op without a user', () => {
    const state: SyncState = { ...INITIAL_SYNC_STATE, isOnline: false };
    const next = syncReducer(state, { type: 'WENT_ONLINE' });

    expect(next.phase.tag).toBe('idle');
    expect(next.isOnline).toBe(true);
  });
});

describe('WENT_OFFLINE', () => {
  it('should preserve pending status when going offline during push', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'WENT_OFFLINE' });

    expect(next.isOnline).toBe(false);
    expect(next.phase.tag).toBe('idle');
    expect(next.hasPendingChanges).toBe(true);
  });

  it('should preserve pending status when going offline during debounce', () => {
    const state = loggedIn({ phase: { tag: 'debouncing' } });
    const next = syncReducer(state, { type: 'WENT_OFFLINE' });

    expect(next.hasPendingChanges).toBe(true);
  });

  it('should not set pending when going offline from synced', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'WENT_OFFLINE' });

    expect(next.hasPendingChanges).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DATA_CHANGED
// ---------------------------------------------------------------------------
describe('DATA_CHANGED', () => {
  it('should be ignored before initial sync completes (bug fix #1)', () => {
    const state: SyncState = {
      ...INITIAL_SYNC_STATE,
      userId: 'user-1',
      phase: { tag: 'initial-sync' },
    };
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next).toBe(state);
  });

  it('should transition from synced to debouncing', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next.phase.tag).toBe('debouncing');
    expect(next.retryCount).toBe(0);
  });

  it('should mark pending during push (stale closure fix)', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next.phase.tag).toBe('pushing');
    expect(next.hasPendingChanges).toBe(true);
  });

  it('should be no-op during debouncing (hook resets timer via deps)', () => {
    const state = loggedIn({ phase: { tag: 'debouncing' } });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next).toBe(state);
  });

  it('should mark pending during conflict', () => {
    const state = loggedIn({
      phase: { tag: 'conflict', cloudData, cloudUpdatedAt: '2025-01-01T00:00:00Z' },
    });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next.hasPendingChanges).toBe(true);
    expect(next.phase.tag).toBe('conflict');
  });

  it('should mark pending when offline', () => {
    const state = loggedIn({ isOnline: false, phase: { tag: 'idle' } });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next.hasPendingChanges).toBe(true);
    expect(next.phase.tag).toBe('idle');
  });

  it('should be ignored without a user', () => {
    const state: SyncState = { ...INITIAL_SYNC_STATE, initialSyncDone: true };
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next).toBe(state);
  });

  it('should reset retryCount when starting fresh debounce', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: false, retryTarget: 'push' },
      retryCount: 3,
    });
    const next = syncReducer(state, { type: 'DATA_CHANGED' });

    expect(next.phase.tag).toBe('debouncing');
    expect(next.retryCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DEBOUNCE_ELAPSED
// ---------------------------------------------------------------------------
describe('DEBOUNCE_ELAPSED', () => {
  it('should transition from debouncing to pushing', () => {
    const state = loggedIn({ phase: { tag: 'debouncing' } });
    const next = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });

    expect(next.phase.tag).toBe('pushing');
  });

  it('should go idle with pending if offline during debounce', () => {
    const state = loggedIn({ phase: { tag: 'debouncing' }, isOnline: false });
    const next = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });

    expect(next.phase.tag).toBe('idle');
    expect(next.hasPendingChanges).toBe(true);
  });

  it('should be no-op when not debouncing', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// INITIAL_SYNC_RESULT
// ---------------------------------------------------------------------------
describe('INITIAL_SYNC_RESULT', () => {
  const base: SyncState = {
    ...INITIAL_SYNC_STATE,
    userId: 'user-1',
    phase: { tag: 'initial-sync' },
  };

  it('should transition to pushing on "push" result', () => {
    const result: InitialSyncResult = { action: 'push' };
    const next = syncReducer(base, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next.phase.tag).toBe('pushing');
    expect(next.initialSyncDone).toBe(true);
  });

  it('should transition to synced on "pull" result', () => {
    const result: InitialSyncResult = { action: 'pull', data: cloudData };
    const next = syncReducer(base, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next.phase.tag).toBe('synced');
    expect(next.initialSyncDone).toBe(true);
  });

  it('should transition to conflict with cloud data', () => {
    const result: InitialSyncResult = {
      action: 'conflict',
      cloudData,
      cloudUpdatedAt: '2025-01-15T12:00:00Z',
    };
    const next = syncReducer(base, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next.phase.tag).toBe('conflict');
    expect(next.initialSyncDone).toBe(true);
    if (next.phase.tag === 'conflict') {
      expect(next.phase.cloudData).toEqual(cloudData);
      expect(next.phase.cloudUpdatedAt).toBe('2025-01-15T12:00:00Z');
    }
  });

  it('should transition to synced on "none" result', () => {
    const result: InitialSyncResult = { action: 'none' };
    const next = syncReducer(base, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next.phase.tag).toBe('synced');
    expect(next.initialSyncDone).toBe(true);
  });

  it('should reset retryCount', () => {
    const withRetries: SyncState = { ...base, retryCount: 2 };
    const result: InitialSyncResult = { action: 'none' };
    const next = syncReducer(withRetries, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next.retryCount).toBe(0);
  });

  it('should be no-op when not in initial-sync phase', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const result: InitialSyncResult = { action: 'push' };
    const next = syncReducer(state, { type: 'INITIAL_SYNC_RESULT', result });

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// INITIAL_SYNC_ERROR
// ---------------------------------------------------------------------------
describe('INITIAL_SYNC_ERROR', () => {
  it('should transition to retryable error targeting initial-sync', () => {
    const state: SyncState = {
      ...INITIAL_SYNC_STATE,
      userId: 'user-1',
      phase: { tag: 'initial-sync' },
    };
    const next = syncReducer(state, { type: 'INITIAL_SYNC_ERROR' });

    expect(next.phase.tag).toBe('error');
    if (next.phase.tag === 'error') {
      expect(next.phase.retryable).toBe(true);
      expect(next.phase.retryTarget).toBe('initial-sync');
    }
    expect(next.retryCount).toBe(1);
  });

  it('should increment retryCount on repeated errors', () => {
    let state: SyncState = {
      ...INITIAL_SYNC_STATE,
      userId: 'user-1',
      phase: { tag: 'initial-sync' },
    };

    state = syncReducer(state, { type: 'INITIAL_SYNC_ERROR' });
    expect(state.retryCount).toBe(1);

    // Simulate retry → back to initial-sync
    state = syncReducer(state, { type: 'RETRY' });
    expect(state.phase.tag).toBe('initial-sync');

    state = syncReducer(state, { type: 'INITIAL_SYNC_ERROR' });
    expect(state.retryCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PUSH_SUCCESS
// ---------------------------------------------------------------------------
describe('PUSH_SUCCESS', () => {
  it('should transition to synced when no pending changes', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'PUSH_SUCCESS' });

    expect(next.phase.tag).toBe('synced');
    expect(next.retryCount).toBe(0);
  });

  it('should start new debounce cycle when pending changes exist', () => {
    const state = loggedIn({ phase: { tag: 'pushing' }, hasPendingChanges: true });
    const next = syncReducer(state, { type: 'PUSH_SUCCESS' });

    expect(next.phase.tag).toBe('debouncing');
    expect(next.hasPendingChanges).toBe(false);
    expect(next.retryCount).toBe(0);
  });

  it('should be no-op when not pushing', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'PUSH_SUCCESS' });

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// PUSH_ERROR
// ---------------------------------------------------------------------------
describe('PUSH_ERROR', () => {
  it('should transition to retryable error on rate limit', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'PUSH_ERROR', retryable: true });

    expect(next.phase.tag).toBe('error');
    if (next.phase.tag === 'error') {
      expect(next.phase.retryable).toBe(true);
      expect(next.phase.retryTarget).toBe('push');
    }
    expect(next.retryCount).toBe(1);
  });

  it('should transition to permanent error on non-retryable failure', () => {
    const state = loggedIn({ phase: { tag: 'pushing' } });
    const next = syncReducer(state, { type: 'PUSH_ERROR', retryable: false });

    if (next.phase.tag === 'error') {
      expect(next.phase.retryable).toBe(false);
    }
  });

  it('should accumulate retryCount across push cycles', () => {
    let state = loggedIn({ phase: { tag: 'pushing' } });

    state = syncReducer(state, { type: 'PUSH_ERROR', retryable: true });
    expect(state.retryCount).toBe(1);

    state = syncReducer(state, { type: 'RETRY' });
    state = syncReducer(state, { type: 'PUSH_ERROR', retryable: true });
    expect(state.retryCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// CONFLICT_RESOLVED
// ---------------------------------------------------------------------------
describe('CONFLICT_RESOLVED', () => {
  const conflictState = loggedIn({
    phase: { tag: 'conflict', cloudData, cloudUpdatedAt: '2025-01-15T12:00:00Z' },
  });

  it('should transition to synced when choosing cloud', () => {
    const next = syncReducer(conflictState, { type: 'CONFLICT_RESOLVED', choice: 'cloud' });

    expect(next.phase.tag).toBe('synced');
  });

  it('should transition to pushing when choosing local', () => {
    const next = syncReducer(conflictState, { type: 'CONFLICT_RESOLVED', choice: 'local' });

    expect(next.phase.tag).toBe('pushing');
  });

  it('should be no-op when not in conflict', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'CONFLICT_RESOLVED', choice: 'cloud' });

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// RETRY
// ---------------------------------------------------------------------------
describe('RETRY', () => {
  it('should retry initial sync from error', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: true, retryTarget: 'initial-sync' },
      retryCount: 1,
      initialSyncDone: false,
    });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next.phase.tag).toBe('initial-sync');
  });

  it('should retry push from error', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: true, retryTarget: 'push' },
      retryCount: 1,
    });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next.phase.tag).toBe('pushing');
  });

  it('should not retry when retryCount exceeds MAX_RETRIES', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: true, retryTarget: 'push' },
      retryCount: MAX_RETRIES + 1,
    });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next.phase.tag).toBe('error');
  });

  it('should not retry non-retryable errors', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: false, retryTarget: 'push' },
      retryCount: 1,
    });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next.phase.tag).toBe('error');
  });

  it('should not retry when offline', () => {
    const state = loggedIn({
      phase: { tag: 'error', retryable: true, retryTarget: 'push' },
      retryCount: 1,
      isOnline: false,
    });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next.phase.tag).toBe('error');
  });

  it('should be no-op when not in error state', () => {
    const state = loggedIn({ phase: { tag: 'synced' } });
    const next = syncReducer(state, { type: 'RETRY' });

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// deriveSyncStatus
// ---------------------------------------------------------------------------
describe('deriveSyncStatus', () => {
  it('should return idle when no user', () => {
    expect(deriveSyncStatus(INITIAL_SYNC_STATE)).toBe('idle');
  });

  it('should return offline when offline', () => {
    expect(deriveSyncStatus(loggedIn({ isOnline: false, phase: { tag: 'idle' } }))).toBe('offline');
  });

  it('should return syncing during initial-sync', () => {
    expect(deriveSyncStatus(loggedIn({ phase: { tag: 'initial-sync' } }))).toBe('syncing');
  });

  it('should return syncing during push', () => {
    expect(deriveSyncStatus(loggedIn({ phase: { tag: 'pushing' } }))).toBe('syncing');
  });

  it('should return synced when synced', () => {
    expect(deriveSyncStatus(loggedIn({ phase: { tag: 'synced' } }))).toBe('synced');
  });

  it('should return synced during debounce', () => {
    expect(deriveSyncStatus(loggedIn({ phase: { tag: 'debouncing' } }))).toBe('synced');
  });

  it('should return error on error', () => {
    expect(
      deriveSyncStatus(loggedIn({ phase: { tag: 'error', retryable: false, retryTarget: 'push' } }))
    ).toBe('error');
  });

  it('should return idle during conflict', () => {
    expect(
      deriveSyncStatus(
        loggedIn({ phase: { tag: 'conflict', cloudData, cloudUpdatedAt: '2025-01-01' } })
      )
    ).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// deriveConflict
// ---------------------------------------------------------------------------
describe('deriveConflict', () => {
  it('should extract conflict data from conflict phase', () => {
    const state = loggedIn({
      phase: { tag: 'conflict', cloudData, cloudUpdatedAt: '2025-01-15T12:00:00Z' },
    });
    const conflict = deriveConflict(state);

    expect(conflict).toEqual({ cloudData, cloudUpdatedAt: '2025-01-15T12:00:00Z' });
  });

  it('should return null for non-conflict phases', () => {
    expect(deriveConflict(loggedIn({ phase: { tag: 'synced' } }))).toBeNull();
    expect(deriveConflict(loggedIn({ phase: { tag: 'pushing' } }))).toBeNull();
    expect(deriveConflict(loggedIn({ phase: { tag: 'idle' } }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// retryDelay
// ---------------------------------------------------------------------------
describe('retryDelay', () => {
  it('should return 2s for first retry', () => {
    expect(retryDelay(0)).toBe(2_000);
  });

  it('should return 4s for second retry', () => {
    expect(retryDelay(1)).toBe(4_000);
  });

  it('should return 8s for third retry', () => {
    expect(retryDelay(2)).toBe(8_000);
  });

  it('should cap at MAX_RETRIES exponent', () => {
    expect(retryDelay(10)).toBe(retryDelay(MAX_RETRIES));
  });
});

// ---------------------------------------------------------------------------
// Integration scenarios
// ---------------------------------------------------------------------------
describe('integration: full sync lifecycle', () => {
  it('should handle login → initial sync → data change → push → synced', () => {
    let state = INITIAL_SYNC_STATE;

    state = syncReducer(state, { type: 'USER_CHANGED', userId: 'user-1' });
    expect(state.phase.tag).toBe('initial-sync');

    state = syncReducer(state, {
      type: 'INITIAL_SYNC_RESULT',
      result: { action: 'none' },
    });
    expect(state.phase.tag).toBe('synced');
    expect(state.initialSyncDone).toBe(true);

    state = syncReducer(state, { type: 'DATA_CHANGED' });
    expect(state.phase.tag).toBe('debouncing');

    state = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });
    expect(state.phase.tag).toBe('pushing');

    state = syncReducer(state, { type: 'PUSH_SUCCESS' });
    expect(state.phase.tag).toBe('synced');
  });

  it('should handle data change during push → pending → re-push', () => {
    let state = loggedIn({ phase: { tag: 'pushing' } });

    state = syncReducer(state, { type: 'DATA_CHANGED' });
    expect(state.hasPendingChanges).toBe(true);

    state = syncReducer(state, { type: 'PUSH_SUCCESS' });
    expect(state.phase.tag).toBe('debouncing');
    expect(state.hasPendingChanges).toBe(false);

    state = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });
    expect(state.phase.tag).toBe('pushing');

    state = syncReducer(state, { type: 'PUSH_SUCCESS' });
    expect(state.phase.tag).toBe('synced');
  });

  it('should handle push failure → retry → success', () => {
    let state = loggedIn({ phase: { tag: 'pushing' } });

    state = syncReducer(state, { type: 'PUSH_ERROR', retryable: true });
    expect(state.phase.tag).toBe('error');
    expect(state.retryCount).toBe(1);

    state = syncReducer(state, { type: 'RETRY' });
    expect(state.phase.tag).toBe('pushing');

    state = syncReducer(state, { type: 'PUSH_SUCCESS' });
    expect(state.phase.tag).toBe('synced');
    expect(state.retryCount).toBe(0);
  });

  it('should handle offline → pending → online → sync', () => {
    let state = loggedIn({ phase: { tag: 'synced' } });

    state = syncReducer(state, { type: 'WENT_OFFLINE' });
    expect(state.isOnline).toBe(false);

    state = syncReducer(state, { type: 'DATA_CHANGED' });
    expect(state.hasPendingChanges).toBe(true);

    state = syncReducer(state, { type: 'WENT_ONLINE' });
    expect(state.phase.tag).toBe('debouncing');
    expect(state.hasPendingChanges).toBe(true);

    state = syncReducer(state, { type: 'DEBOUNCE_ELAPSED' });
    state = syncReducer(state, { type: 'PUSH_SUCCESS' });
    expect(state.phase.tag).toBe('synced');
  });

  it('should exhaust retries and stay in error', () => {
    let state = loggedIn({ phase: { tag: 'pushing' } });

    for (let i = 0; i <= MAX_RETRIES; i++) {
      state = syncReducer(state, { type: 'PUSH_ERROR', retryable: true });
      const retryResult = syncReducer(state, { type: 'RETRY' });
      if (i < MAX_RETRIES) {
        expect(retryResult.phase.tag).toBe('pushing');
        state = retryResult;
      } else {
        expect(retryResult.phase.tag).toBe('error');
        state = retryResult;
      }
    }

    expect(state.retryCount).toBe(MAX_RETRIES + 1);
  });

  it('should handle rapid user switch during initial sync (bug fix #2)', () => {
    const state = dispatch(
      INITIAL_SYNC_STATE,
      { type: 'USER_CHANGED', userId: 'user-A' },
      { type: 'USER_CHANGED', userId: 'user-B' }
    );

    expect(state.userId).toBe('user-B');
    expect(state.phase.tag).toBe('initial-sync');
    expect(state.initialSyncDone).toBe(false);
  });
});
