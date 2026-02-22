/**
 * Nivel 7 — Cycle 1 day definitions (weeks 1–6, block 1 and block 2).
 * Exported as a pre-computed array so nivel7.ts can stay under 600 lines.
 */
import type { ProgramDefinition } from '../../types/program';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Tier = 't1' | 't2' | 't3';
type ProgramDay = ProgramDefinition['days'][number];
type ExerciseSlot = ProgramDay['slots'][number];
type ProgressionRule = ExerciseSlot['onSuccess'];

const NO_CHANGE: ProgressionRule = { type: 'no_change' };
const ADD_WEIGHT: ProgressionRule = { type: 'add_weight' };
const ADVANCE_STAGE: ProgressionRule = { type: 'advance_stage' };

type Cycle = 'c1' | 'c2';
type SlotPhase = 'b1' | 'b1d' | 'b2';

const PHASE_OFFSETS: Record<Cycle, Record<SlotPhase, number>> = {
  c1: { b1: 4, b1d: 4, b2: 2 },
  c2: { b1: 3, b1d: 3, b2: 1 },
};

interface MainLiftOpts {
  readonly exerciseId: string;
  readonly cycle: Cycle;
  readonly phase: SlotPhase;
  readonly sets: number;
  readonly reps: number;
}

function mainLift({ exerciseId, cycle, phase, sets, reps }: MainLiftOpts): ExerciseSlot {
  const isDeload = phase === 'b1d';
  return {
    id: `${exerciseId}-${cycle}${phase}`,
    exerciseId,
    tier: 't1',
    stages: [{ sets, reps }],
    onSuccess: isDeload ? NO_CHANGE : ADD_WEIGHT,
    onUndefined: isDeload ? NO_CHANGE : ADD_WEIGHT,
    onMidStageFail: NO_CHANGE,
    onFinalStageFail: NO_CHANGE,
    startWeightKey: exerciseId,
    startWeightOffset: PHASE_OFFSETS[cycle][phase],
  };
}

function dpAcc(exerciseId: string, tier: Tier): ExerciseSlot {
  return {
    id: exerciseId,
    exerciseId,
    tier,
    stages: [
      { sets: 3, reps: 8 },
      { sets: 3, reps: 9 },
      { sets: 3, reps: 10 },
      { sets: 3, reps: 11 },
      { sets: 3, reps: 12 },
    ],
    onSuccess: ADVANCE_STAGE,
    onFinalStageSuccess: { type: 'add_weight_reset_stage', amount: 2.5 },
    onUndefined: ADVANCE_STAGE,
    onMidStageFail: NO_CHANGE,
    onFinalStageFail: NO_CHANGE,
    startWeightKey: exerciseId,
  };
}

// ---------------------------------------------------------------------------
// Cycle day generator
// ---------------------------------------------------------------------------

function cycleDays(cycle: Cycle): ProgramDay[] {
  const ml = (opts: Omit<MainLiftOpts, 'cycle'>): ExerciseSlot => mainLift({ ...opts, cycle });

  return [
    // =================================================================
    // BLOCK 1 — 5×5 main lifts, 1×5 deadlift
    // =================================================================

    // --- Week 1 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_post', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1', sets: 1, reps: 5 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_alt', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('hip_thrust', 't2'),
      ],
    },

    // --- Week 2 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_front', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1', sets: 1, reps: 5 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_mart', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1', sets: 5, reps: 5 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('zancadas', 't2'),
      ],
    },

    // --- Week 3 (deload) ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b1d', sets: 5, reps: 5 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_post', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1d', sets: 1, reps: 5 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1d', sets: 5, reps: 5 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_alt', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1d', sets: 5, reps: 5 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('leg_press_gem', 't3'),
      ],
    },

    // =================================================================
    // BLOCK 2 — 3×3 main lifts, 1×3 deadlift
    // =================================================================

    // --- Week 4 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_post', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_alt', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('hip_thrust', 't2'),
      ],
    },

    // --- Week 5 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_front', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_mart', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('zancadas', 't2'),
      ],
    },

    // --- Week 6 (record) ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('press_franc', 't2'),
        dpAcc('ext_polea', 't3'),
        dpAcc('elev_lat', 't3'),
        dpAcc('elev_post', 't3'),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3 }),
        dpAcc('remo_bar', 't2'),
        dpAcc('jalon', 't2'),
        dpAcc('face_pull', 't3'),
        dpAcc('gemelo_pie', 't3'),
        dpAcc('gemelo_sent', 't3'),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('apert', 't2'),
        dpAcc('cruces', 't3'),
        dpAcc('curl_bar', 't2'),
        dpAcc('curl_alt', 't3'),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        dpAcc('prensa', 't2'),
        dpAcc('ext_quad', 't3'),
        dpAcc('curl_fem', 't3'),
        dpAcc('leg_press_gem', 't3'),
      ],
    },
  ];
}

/** All 24 days for cycle 1 (weeks 1–6). */
export const CYCLE_1_DAYS: readonly ProgramDay[] = cycleDays('c1');

/** All 24 days for cycle 2 (weeks 7–12). */
export const CYCLE_2_DAYS: readonly ProgramDay[] = cycleDays('c2');
