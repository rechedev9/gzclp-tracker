import { ProgramInstanceMapSchema } from './schemas/instance';
import { StartWeightsSchema } from './schemas';
import {
  loadData as legacyLoadData,
  saveData as legacySaveData,
  clearData as legacyClearData,
} from './storage';
import {
  convertResultsToGeneric,
  convertResultsToLegacy,
  convertUndoToGeneric,
  convertUndoToLegacy,
  convertLegacyToInstanceMap,
  GZCLP_MIGRATED_ID,
} from './migrations/v3-to-v1';
import { isRecord } from './type-guards';
import type { ProgramInstance, ProgramInstanceMap } from '@/types/program';
import type { StoredData } from './storage';

const STORAGE_KEY = 'wt-programs-v1';

// ---------------------------------------------------------------------------
// Low-level new-format CRUD
// ---------------------------------------------------------------------------

export function loadInstanceMap(): ProgramInstanceMap | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const result = ProgramInstanceMapSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

export function saveInstanceMap(map: ProgramInstanceMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // QuotaExceededError — data persists in React state
  }
}

export function clearInstanceMap(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getActiveInstance(map: ProgramInstanceMap): ProgramInstance | null {
  if (!map.activeProgramId) return null;
  return map.instances[map.activeProgramId] ?? null;
}

export function updateInstance(
  map: ProgramInstanceMap,
  instanceId: string,
  updates: Partial<Pick<ProgramInstance, 'config' | 'results' | 'undoHistory' | 'status' | 'name'>>
): ProgramInstanceMap {
  const instance = map.instances[instanceId];
  if (!instance) return map;
  return {
    ...map,
    instances: {
      ...map.instances,
      [instanceId]: {
        ...instance,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Migration: gzclp-v3 → wt-programs-v1
// ---------------------------------------------------------------------------

function migrateFromLegacy(): ProgramInstanceMap | null {
  const oldData = legacyLoadData();
  if (!oldData) return null;

  const map = convertLegacyToInstanceMap(oldData);

  // Persist new format (old gzclp-v3 key preserved as read-only backup)
  saveInstanceMap(map);
  return map;
}

// ---------------------------------------------------------------------------
// Compat layer: drop-in replacements for storage.ts functions
// ---------------------------------------------------------------------------

function instanceToStoredData(instance: ProgramInstance): StoredData | null {
  const startWeightsResult = StartWeightsSchema.safeParse(instance.config);
  if (!startWeightsResult.success) return null;

  return {
    startWeights: startWeightsResult.data,
    results: convertResultsToLegacy(instance.results),
    undoHistory: convertUndoToLegacy(instance.undoHistory),
  };
}

/**
 * Load data with automatic migration. Tries new format first,
 * falls back to migrating old gzclp-v3 data.
 */
export function loadDataCompat(): StoredData | null {
  // Try new format
  const map = loadInstanceMap();
  if (map) {
    const instance = getActiveInstance(map);
    if (instance) return instanceToStoredData(instance);
  }

  // Try migrating from legacy
  const migrated = migrateFromLegacy();
  if (migrated) {
    const instance = getActiveInstance(migrated);
    if (instance) return instanceToStoredData(instance);
  }

  return null;
}

/**
 * Save data to both new and legacy storage formats.
 * Dual-write ensures cloud sync (which reads legacy format) keeps working.
 */
export function saveDataCompat(data: StoredData): void {
  if (typeof window === 'undefined') return;

  let map = loadInstanceMap();

  if (map && map.activeProgramId && map.instances[map.activeProgramId]) {
    // Update existing active instance
    map = updateInstance(map, map.activeProgramId, {
      config: { ...data.startWeights },
      results: convertResultsToGeneric(data.results),
      undoHistory: convertUndoToGeneric(data.undoHistory),
    });
  } else {
    // Create fresh instance map (new user or corrupted state)
    const now = new Date().toISOString();
    map = {
      version: 1,
      activeProgramId: GZCLP_MIGRATED_ID,
      instances: {
        [GZCLP_MIGRATED_ID]: {
          id: GZCLP_MIGRATED_ID,
          programId: 'gzclp',
          name: 'GZCLP',
          config: { ...data.startWeights },
          results: convertResultsToGeneric(data.results),
          undoHistory: convertUndoToGeneric(data.undoHistory),
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
      },
    };
  }

  saveInstanceMap(map);

  // Dual-write: also save to legacy key for cloud sync backward compat
  legacySaveData(data);
}

/** Clear both new and legacy storage. */
export function clearDataCompat(): void {
  clearInstanceMap();
  legacyClearData();
}

/** Re-export unchanged functions that don't need adaptation. */
export { createExportData, parseImportData, type StoredData } from './storage';
