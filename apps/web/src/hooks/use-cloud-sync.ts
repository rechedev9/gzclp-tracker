'use client';

import { useEffect, useReducer, useRef, useCallback } from 'react';
// Accepts any user object with an id string (Supabase User or custom UserInfo)
interface MinimalUser {
  readonly id: string;
}
import { getSupabaseClient } from '@/lib/supabase';
import { type StoredData, validateStoredData } from '@/lib/storage';
import {
  type SyncStatus,
  fetchCloudData,
  pushToCloud,
  deleteCloudData,
  determineInitialSync,
  loadSyncMeta,
  markLocalUpdated,
  markSynced,
  clearSyncMeta,
} from '@/lib/sync';
import {
  type SyncState,
  type ConflictState,
  syncReducer,
  deriveSyncStatus,
  deriveConflict,
  INITIAL_SYNC_STATE,
  DEBOUNCE_MS,
  SYNC_TIMEOUT_MS,
  MAX_RETRIES,
  retryDelay,
} from '@/lib/sync-machine';

const SYNC_LOCK_NAME = 'gzclp-cloud-sync';

/** Cross-tab mutex using Web Locks API. Returns null if another tab holds the lock. */
async function withSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!navigator.locks) return fn();
  return navigator.locks.request(SYNC_LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (!lock) return null;
    return fn();
  });
}

/** Races a promise against a timeout. Rejects with Error('TIMEOUT') on expiry. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

interface UseCloudSyncOptions {
  readonly user: MinimalUser | null;
  readonly startWeights: StoredData['startWeights'] | null;
  readonly results: StoredData['results'];
  readonly undoHistory: StoredData['undoHistory'];
  readonly onCloudDataReceived: (data: StoredData) => void;
}

interface UseCloudSyncReturn {
  readonly syncStatus: SyncStatus;
  readonly conflict: ConflictState | null;
  readonly resolveConflict: (choice: 'local' | 'cloud') => void;
  readonly clearCloudData: () => Promise<void>;
}

export function useCloudSync({
  user,
  startWeights,
  results,
  undoHistory,
  onCloudDataReceived,
}: UseCloudSyncOptions): UseCloudSyncReturn {
  const [state, dispatch] = useReducer(
    syncReducer,
    undefined,
    (): SyncState => ({
      ...INITIAL_SYNC_STATE,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    })
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const abortRef = useRef<AbortController | null>(null);

  // --- Online / offline listener ---
  useEffect(() => {
    const goOnline = (): void => dispatch({ type: 'WENT_ONLINE' });
    const goOffline = (): void => dispatch({ type: 'WENT_OFFLINE' });
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return (): void => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // --- User change detection (aborts in-flight sync on switch — bug fix #2) ---
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'USER_CHANGED', userId: user?.id ?? null });
  }, [user?.id]);

  // --- Data change detection ---
  useEffect(() => {
    if (!state.initialSyncDone || !user || !startWeights) return;
    markLocalUpdated();
    dispatch({ type: 'DATA_CHANGED' });
  }, [state.initialSyncDone, user, startWeights, results, undoHistory]);

  // --- Effect: initial sync when phase becomes 'initial-sync' ---
  useEffect(() => {
    if (state.phase.tag !== 'initial-sync' || !state.userId) return;

    const abort = new AbortController();
    abortRef.current = abort;
    const userId = state.userId;

    const run = async (): Promise<void> => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        dispatch({ type: 'INITIAL_SYNC_ERROR' });
        return;
      }

      try {
        const decision = await withSyncLock(async () => {
          const cloudResult = await withTimeout(fetchCloudData(supabase, userId), SYNC_TIMEOUT_MS);
          if (abort.signal.aborted) return null;

          const localData: StoredData | null =
            startWeights !== null ? { startWeights, results, undoHistory } : null;
          const syncMeta = loadSyncMeta();
          return determineInitialSync(localData, cloudResult, syncMeta);
        });

        if (abort.signal.aborted) return;

        if (decision === null) {
          dispatch({ type: 'INITIAL_SYNC_ERROR' });
          return;
        }

        if (decision.action === 'pull') {
          onCloudDataReceived(decision.data);
          markSynced();
        }

        dispatch({ type: 'INITIAL_SYNC_RESULT', result: decision });
      } catch {
        if (!abort.signal.aborted) {
          dispatch({ type: 'INITIAL_SYNC_ERROR' });
        }
      }
    };

    void run();
    return (): void => {
      abort.abort();
    };
  }, [state.phase.tag, state.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Effect: push when phase becomes 'pushing' ---
  useEffect(() => {
    if (state.phase.tag !== 'pushing' || !state.userId) return;

    const abort = new AbortController();
    abortRef.current = abort;
    const userId = state.userId;
    const currentStartWeights = startWeights;
    const currentResults = results;
    const currentUndoHistory = undoHistory;

    const run = async (): Promise<void> => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentStartWeights) {
        dispatch({ type: 'PUSH_ERROR', retryable: false });
        return;
      }

      try {
        const pushResult = await withSyncLock(async () =>
          withTimeout(
            pushToCloud(supabase, userId, {
              startWeights: currentStartWeights,
              results: currentResults,
              undoHistory: currentUndoHistory,
            }),
            SYNC_TIMEOUT_MS
          )
        );

        if (abort.signal.aborted) return;

        if (pushResult === null) {
          dispatch({ type: 'PUSH_ERROR', retryable: true });
          return;
        }

        if (pushResult.success) {
          dispatch({ type: 'PUSH_SUCCESS' });
        } else {
          dispatch({ type: 'PUSH_ERROR', retryable: pushResult.retryable });
        }
      } catch {
        if (!abort.signal.aborted) {
          dispatch({ type: 'PUSH_ERROR', retryable: true });
        }
      }
    };

    void run();
    return (): void => {
      abort.abort();
    };
  }, [state.phase.tag, state.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Effect: debounce timer (resets on data change via deps) ---
  useEffect(() => {
    if (state.phase.tag !== 'debouncing') return;
    const timer = setTimeout(() => dispatch({ type: 'DEBOUNCE_ELAPSED' }), DEBOUNCE_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [state.phase.tag, startWeights, results, undoHistory]);

  // --- Effect: retry timer with exponential backoff (bug fix #3) ---
  useEffect(() => {
    if (state.phase.tag !== 'error') return;
    if (!state.phase.retryable || state.retryCount > MAX_RETRIES) return;

    const delay = retryDelay(state.retryCount - 1);
    const timer = setTimeout(() => dispatch({ type: 'RETRY' }), delay);
    return (): void => {
      clearTimeout(timer);
    };
  }, [state.phase.tag, state.retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Conflict resolution ---
  const resolveConflict = useCallback(
    (choice: 'local' | 'cloud'): void => {
      const currentState = stateRef.current;
      if (currentState.phase.tag !== 'conflict' || !user) return;

      if (choice === 'cloud') {
        const validated = validateStoredData(currentState.phase.cloudData);
        if (!validated) return;
        onCloudDataReceived(validated);
        markSynced();
      }

      dispatch({ type: 'CONFLICT_RESOLVED', choice });
    },
    [user, onCloudDataReceived]
  );

  // --- Clear cloud data (independent of state machine) ---
  const clearCloudData = useCallback(async (): Promise<void> => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await deleteCloudData(supabase, user.id);
    clearSyncMeta();
  }, [user]);

  return {
    syncStatus: deriveSyncStatus(state),
    conflict: deriveConflict(state),
    resolveConflict,
    clearCloudData,
  };
}
