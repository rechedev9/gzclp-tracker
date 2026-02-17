/**
 * Pure state machine for cloud sync lifecycle.
 * No React, no async, no browser APIs — fully testable.
 */

import type { StoredData } from './storage';
import type { InitialSyncResult, SyncStatus } from './sync';

// --- Constants ---

export const DEBOUNCE_MS = 2_000;
export const SYNC_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 3;
const BASE_RETRY_MS = 2_000;

/** Exponential backoff: 2s, 4s, 8s */
export function retryDelay(count: number): number {
  return BASE_RETRY_MS * 2 ** Math.min(count, MAX_RETRIES);
}

// --- Phase (discriminated union replaces isSyncingRef + initialSyncDone + debounceRef) ---

export type SyncPhase =
  | { readonly tag: 'idle' }
  | { readonly tag: 'initial-sync' }
  | { readonly tag: 'synced' }
  | { readonly tag: 'debouncing' }
  | { readonly tag: 'pushing' }
  | {
      readonly tag: 'conflict';
      readonly cloudData: StoredData;
      readonly cloudUpdatedAt: string;
    }
  | {
      readonly tag: 'error';
      readonly retryable: boolean;
      readonly retryTarget: 'initial-sync' | 'push';
    };

// --- State ---

export interface SyncState {
  readonly phase: SyncPhase;
  readonly userId: string | null;
  readonly isOnline: boolean;
  readonly initialSyncDone: boolean;
  readonly hasPendingChanges: boolean;
  readonly retryCount: number;
}

export const INITIAL_SYNC_STATE: SyncState = {
  phase: { tag: 'idle' },
  userId: null,
  isOnline: true,
  initialSyncDone: false,
  hasPendingChanges: false,
  retryCount: 0,
};

// --- Actions ---

export type SyncAction =
  | { readonly type: 'USER_CHANGED'; readonly userId: string | null }
  | { readonly type: 'WENT_ONLINE' }
  | { readonly type: 'WENT_OFFLINE' }
  | { readonly type: 'DATA_CHANGED' }
  | { readonly type: 'DEBOUNCE_ELAPSED' }
  | { readonly type: 'INITIAL_SYNC_RESULT'; readonly result: InitialSyncResult }
  | { readonly type: 'INITIAL_SYNC_ERROR' }
  | { readonly type: 'PUSH_SUCCESS' }
  | { readonly type: 'PUSH_ERROR'; readonly retryable: boolean }
  | { readonly type: 'CONFLICT_RESOLVED'; readonly choice: 'local' | 'cloud' }
  | { readonly type: 'RETRY' };

// --- Conflict state for consumers ---

export interface ConflictState {
  readonly cloudData: StoredData;
  readonly cloudUpdatedAt: string;
}

// --- Helpers ---

function applyInitialSyncResult(state: SyncState, result: InitialSyncResult): SyncState {
  const base: SyncState = { ...state, initialSyncDone: true, retryCount: 0 };
  switch (result.action) {
    case 'push':
      return { ...base, phase: { tag: 'pushing' } };
    case 'pull':
      return { ...base, phase: { tag: 'synced' } };
    case 'conflict':
      return {
        ...base,
        phase: {
          tag: 'conflict',
          cloudData: result.cloudData,
          cloudUpdatedAt: result.cloudUpdatedAt,
        },
      };
    case 'none':
      return { ...base, phase: { tag: 'synced' } };
  }
}

// --- Reducer ---

export function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'USER_CHANGED': {
      if (action.userId === null) {
        return { ...INITIAL_SYNC_STATE, isOnline: state.isOnline };
      }
      if (action.userId === state.userId && state.initialSyncDone) {
        return state;
      }
      return {
        phase: state.isOnline ? { tag: 'initial-sync' } : { tag: 'idle' },
        userId: action.userId,
        isOnline: state.isOnline,
        initialSyncDone: false,
        hasPendingChanges: false,
        retryCount: 0,
      };
    }

    case 'WENT_ONLINE': {
      const next: SyncState = { ...state, isOnline: true };
      if (!next.userId) return next;
      if (!next.initialSyncDone) {
        return { ...next, phase: { tag: 'initial-sync' } };
      }
      if (
        next.hasPendingChanges ||
        state.phase.tag === 'error' ||
        state.phase.tag === 'pushing' ||
        state.phase.tag === 'debouncing'
      ) {
        return { ...next, phase: { tag: 'debouncing' }, hasPendingChanges: true };
      }
      return next;
    }

    case 'WENT_OFFLINE': {
      const hadPending =
        state.hasPendingChanges ||
        state.phase.tag === 'pushing' ||
        state.phase.tag === 'debouncing';
      return {
        ...state,
        isOnline: false,
        phase: { tag: 'idle' },
        hasPendingChanges: hadPending,
      };
    }

    case 'DATA_CHANGED': {
      if (!state.initialSyncDone || !state.userId) return state;
      if (!state.isOnline) return { ...state, hasPendingChanges: true };

      switch (state.phase.tag) {
        case 'pushing':
          return { ...state, hasPendingChanges: true };
        case 'debouncing':
          return state;
        case 'conflict':
          return { ...state, hasPendingChanges: true };
        default:
          return {
            ...state,
            phase: { tag: 'debouncing' },
            hasPendingChanges: false,
            retryCount: 0,
          };
      }
    }

    case 'DEBOUNCE_ELAPSED': {
      if (state.phase.tag !== 'debouncing') return state;
      if (!state.isOnline) {
        return { ...state, phase: { tag: 'idle' }, hasPendingChanges: true };
      }
      // Clear pending flag — push will use current data. Only DATA_CHANGED
      // during the push phase should set hasPendingChanges for a follow-up cycle.
      return { ...state, phase: { tag: 'pushing' }, hasPendingChanges: false };
    }

    case 'INITIAL_SYNC_RESULT': {
      if (state.phase.tag !== 'initial-sync') return state;
      return applyInitialSyncResult(state, action.result);
    }

    case 'INITIAL_SYNC_ERROR': {
      if (state.phase.tag !== 'initial-sync') return state;
      return {
        ...state,
        phase: { tag: 'error', retryable: true, retryTarget: 'initial-sync' },
        retryCount: state.retryCount + 1,
      };
    }

    case 'PUSH_SUCCESS': {
      if (state.phase.tag !== 'pushing') return state;
      if (state.hasPendingChanges) {
        return { ...state, phase: { tag: 'debouncing' }, hasPendingChanges: false, retryCount: 0 };
      }
      return { ...state, phase: { tag: 'synced' }, retryCount: 0 };
    }

    case 'PUSH_ERROR': {
      if (state.phase.tag !== 'pushing') return state;
      return {
        ...state,
        phase: { tag: 'error', retryable: action.retryable, retryTarget: 'push' },
        retryCount: state.retryCount + 1,
      };
    }

    case 'CONFLICT_RESOLVED': {
      if (state.phase.tag !== 'conflict') return state;
      if (action.choice === 'cloud') {
        return { ...state, phase: { tag: 'synced' } };
      }
      return { ...state, phase: { tag: 'pushing' } };
    }

    case 'RETRY': {
      if (state.phase.tag !== 'error') return state;
      if (!state.phase.retryable) return state;
      if (state.retryCount > MAX_RETRIES) return state;
      if (!state.isOnline) return state;
      return {
        ...state,
        phase: { tag: state.phase.retryTarget === 'initial-sync' ? 'initial-sync' : 'pushing' },
      };
    }
  }

  return state;
}

// --- Derived values ---

export function deriveSyncStatus(state: SyncState): SyncStatus {
  if (!state.userId) return 'idle';
  if (!state.isOnline) return 'offline';
  switch (state.phase.tag) {
    case 'initial-sync':
    case 'pushing':
      return 'syncing';
    case 'synced':
    case 'debouncing':
      return 'synced';
    case 'error':
      return 'error';
    case 'conflict':
    case 'idle':
      return 'idle';
  }
}

export function deriveConflict(state: SyncState): ConflictState | null {
  if (state.phase.tag !== 'conflict') return null;
  return {
    cloudData: state.phase.cloudData,
    cloudUpdatedAt: state.phase.cloudUpdatedAt,
  };
}
