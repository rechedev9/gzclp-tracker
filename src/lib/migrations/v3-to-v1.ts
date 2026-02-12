/**
 * Migration: gzclp-v3 (tier-keyed) → wt-programs-v1 (slot-keyed)
 *
 * Pure conversion functions with no side effects.
 * I/O (localStorage read/write) is handled by storage-v2.ts.
 */

import { GZCLP_DEFINITION } from '../programs/gzclp';
import type { StoredData } from '../storage';
import type { Results, UndoHistory, Tier } from '@/types';
import type { ProgramInstanceMap, GenericResults, GenericUndoHistory } from '@/types/program';

const GZCLP_MIGRATED_ID = 'gzclp-migrated';

// ---------------------------------------------------------------------------
// Slot ↔ Tier lookup tables (built once from GZCLP definition)
// ---------------------------------------------------------------------------

/** dayIndex → tier → slotId */
function buildDaySlotMap(): Record<number, Record<string, string>> {
  const map: Record<number, Record<string, string>> = {};
  for (let i = 0; i < GZCLP_DEFINITION.days.length; i++) {
    const day = GZCLP_DEFINITION.days[i];
    map[i] = {};
    for (const slot of day.slots) {
      map[i][slot.tier] = slot.id;
    }
  }
  return map;
}

/** slotId → tier */
function buildSlotTierMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const day of GZCLP_DEFINITION.days) {
    for (const slot of day.slots) {
      map[slot.id] = slot.tier;
    }
  }
  return map;
}

const DAY_SLOT_MAP = buildDaySlotMap();
const SLOT_TIER_MAP = buildSlotTierMap();

// ---------------------------------------------------------------------------
// Conversion: old tier-keyed → new slot-keyed
// ---------------------------------------------------------------------------

export function convertResultsToGeneric(oldResults: Results): GenericResults {
  const generic: GenericResults = {};

  for (const [indexStr, result] of Object.entries(oldResults)) {
    const dayIndex = Number(indexStr) % GZCLP_DEFINITION.cycleLength;
    const slotMap = DAY_SLOT_MAP[dayIndex];
    if (!slotMap) continue;

    const slots: Record<string, { result?: 'success' | 'fail'; amrapReps?: number }> = {};

    for (const tier of ['t1', 't2', 't3'] as const) {
      const resultVal = result[tier];
      if (resultVal === undefined) continue;
      const slotId = slotMap[tier];
      if (!slotId) continue;
      slots[slotId] = { result: resultVal };
    }

    // AMRAP reps (T1 and T3 only in legacy format)
    if (result.t1Reps !== undefined && slotMap.t1) {
      slots[slotMap.t1] = { ...slots[slotMap.t1], amrapReps: result.t1Reps };
    }
    if (result.t3Reps !== undefined && slotMap.t3) {
      slots[slotMap.t3] = { ...slots[slotMap.t3], amrapReps: result.t3Reps };
    }

    if (Object.keys(slots).length > 0) {
      generic[indexStr] = slots;
    }
  }

  return generic;
}

export function convertUndoToGeneric(old: UndoHistory): GenericUndoHistory {
  return old
    .map((entry) => {
      const dayIndex = entry.i % GZCLP_DEFINITION.cycleLength;
      const slotId = DAY_SLOT_MAP[dayIndex]?.[entry.tier];
      if (!slotId) return null;
      return { i: entry.i, slotId, prev: entry.prev };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

// ---------------------------------------------------------------------------
// Conversion: new slot-keyed → old tier-keyed
// ---------------------------------------------------------------------------

export function convertResultsToLegacy(generic: GenericResults): Results {
  const legacy: Results = {};

  for (const [indexStr, slotResults] of Object.entries(generic)) {
    const entry: {
      t1?: 'success' | 'fail';
      t2?: 'success' | 'fail';
      t3?: 'success' | 'fail';
      t1Reps?: number;
      t3Reps?: number;
    } = {};
    let hasData = false;

    for (const [slotId, slotResult] of Object.entries(slotResults)) {
      const tier = SLOT_TIER_MAP[slotId];
      if (!tier) continue;

      if (slotResult.result !== undefined) {
        if (tier === 't1') entry.t1 = slotResult.result;
        else if (tier === 't2') entry.t2 = slotResult.result;
        else if (tier === 't3') entry.t3 = slotResult.result;
        hasData = true;
      }

      if (slotResult.amrapReps !== undefined) {
        if (tier === 't1') entry.t1Reps = slotResult.amrapReps;
        else if (tier === 't3') entry.t3Reps = slotResult.amrapReps;
      }
    }

    if (hasData) {
      legacy[indexStr] = entry;
    }
  }

  return legacy;
}

export function convertUndoToLegacy(generic: GenericUndoHistory): UndoHistory {
  return generic
    .map((entry) => {
      const tier = SLOT_TIER_MAP[entry.slotId];
      if (!tier) return null;
      return { i: entry.i, tier: tier as Tier, prev: entry.prev };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

// ---------------------------------------------------------------------------
// Full migration: StoredData → ProgramInstanceMap
// ---------------------------------------------------------------------------

/** Converts legacy GZCLP StoredData into a new-format ProgramInstanceMap. */
export function convertLegacyToInstanceMap(oldData: StoredData): ProgramInstanceMap {
  const now = new Date().toISOString();

  return {
    version: 1,
    activeProgramId: GZCLP_MIGRATED_ID,
    instances: {
      [GZCLP_MIGRATED_ID]: {
        id: GZCLP_MIGRATED_ID,
        programId: 'gzclp',
        name: 'GZCLP',
        config: { ...oldData.startWeights },
        results: convertResultsToGeneric(oldData.results),
        undoHistory: convertUndoToGeneric(oldData.undoHistory),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    },
  };
}

export { GZCLP_MIGRATED_ID };
