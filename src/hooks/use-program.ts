'use client';

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { StartWeights, Results, UndoHistory, Tier, ResultValue } from '@/types';
import {
  loadDataCompat as loadData,
  saveDataCompat as saveData,
  clearDataCompat as clearData,
  parseImportData,
  createExportData,
  type StoredData,
} from '@/lib/storage-v2';

const MAX_UNDO_HISTORY = 50;

function removeTierResult(results: Results, index: number, tier: Tier): Results {
  const updated = { ...results };
  if (updated[index]) {
    const entry = { ...updated[index] };
    delete entry[tier];
    if (Object.keys(entry).length === 0) {
      delete updated[index];
    } else {
      updated[index] = entry;
    }
  }
  return updated;
}

interface UseProgramReturn {
  startWeights: StartWeights | null;
  results: Results;
  undoHistory: UndoHistory;
  generateProgram: (weights: StartWeights) => void;
  updateWeights: (weights: StartWeights) => void;
  markResult: (index: number, tier: Tier, value: ResultValue) => void;
  setAmrapReps: (index: number, field: 't1Reps' | 't3Reps', reps: number | undefined) => void;
  undoSpecific: (index: number, tier: Tier) => void;
  undoLast: () => void;
  resetAll: () => void;
  exportData: () => void;
  importData: (json: string) => boolean;
  loadFromCloud: (data: StoredData) => void;
}

export function useProgram(): UseProgramReturn {
  // useSyncExternalStore returns false on server, true on client — no hydration mismatch
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [startWeights, setStartWeights] = useState<StartWeights | null>(() =>
    isClient ? (loadData()?.startWeights ?? null) : null
  );
  const [results, setResults] = useState<Results>(() =>
    isClient ? (loadData()?.results ?? {}) : {}
  );
  const [undoHistory, setUndoHistory] = useState<UndoHistory>(() =>
    isClient ? (loadData()?.undoHistory ?? []) : []
  );
  const isInitialMount = useRef(true);

  // Save to localStorage on changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!startWeights) return;
    saveData({ results, startWeights, undoHistory });
  }, [results, startWeights, undoHistory]);

  const generateProgram = useCallback((weights: StartWeights) => {
    setStartWeights(weights);
    setResults({});
    setUndoHistory([]);
  }, []);

  const updateWeights = useCallback((weights: StartWeights) => {
    setStartWeights(weights);
  }, []);

  const markResult = useCallback(
    (index: number, tier: Tier, value: ResultValue) => {
      setUndoHistory((prev) =>
        [...prev, { i: index, tier, prev: results[index]?.[tier] }].slice(-MAX_UNDO_HISTORY)
      );
      setResults((prev) => ({
        ...prev,
        [index]: { ...prev[index], [tier]: value },
      }));
    },
    [results]
  );

  const setAmrapReps = useCallback(
    (index: number, field: 't1Reps' | 't3Reps', reps: number | undefined) => {
      setResults((prev) => {
        const entry = { ...prev[index] };
        if (reps === undefined) {
          delete entry[field];
        } else {
          entry[field] = reps;
        }
        return { ...prev, [index]: entry };
      });
    },
    []
  );

  const undoSpecific = useCallback(
    (index: number, tier: Tier) => {
      const currentValue = results[index]?.[tier];
      if (!currentValue) return;

      setUndoHistory((prev) =>
        [...prev, { i: index, tier, prev: currentValue }].slice(-MAX_UNDO_HISTORY)
      );
      setResults((prev) => removeTierResult(prev, index, tier));
    },
    [results]
  );

  const undoLast = useCallback(() => {
    if (undoHistory.length === 0) return;

    const lastEntry = undoHistory[undoHistory.length - 1];
    setUndoHistory((prev) => prev.slice(0, -1));

    setResults((prev) => {
      if (lastEntry.prev === undefined) {
        return removeTierResult(prev, lastEntry.i, lastEntry.tier);
      }
      // Restore the previous value
      return {
        ...prev,
        [lastEntry.i]: {
          ...prev[lastEntry.i],
          [lastEntry.tier]: lastEntry.prev,
        },
      };
    });
  }, [undoHistory]);

  const resetAll = useCallback(() => {
    setStartWeights(null);
    setResults({});
    setUndoHistory([]);
    clearData();
  }, []);

  const exportData = useCallback(() => {
    if (!startWeights) return;
    const data = createExportData({ results, startWeights, undoHistory });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gzclp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results, startWeights, undoHistory]);

  const importData = useCallback((json: string): boolean => {
    const data = parseImportData(json);
    if (!data) return false;
    setStartWeights(data.startWeights);
    setResults(data.results);
    setUndoHistory(data.undoHistory);
    return true;
  }, []);

  const loadFromCloud = useCallback((data: StoredData): void => {
    setStartWeights(data.startWeights);
    setResults(data.results);
    setUndoHistory(data.undoHistory);
  }, []);

  return {
    startWeights,
    results,
    undoHistory,
    generateProgram,
    updateWeights,
    markResult,
    setAmrapReps,
    undoSpecific,
    undoLast,
    resetAll,
    exportData,
    importData,
    loadFromCloud,
  };
}
