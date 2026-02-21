import type { ProgramDefinition } from '../types/program';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tier = 't1' | 't2' | 't3';
type ProgramDay = ProgramDefinition['days'][number];
type ExerciseSlot = ProgramDay['slots'][number];
type ProgressionRule = ExerciseSlot['onSuccess'];

const NO_CHANGE: ProgressionRule = { type: 'no_change' };
const ADD_WEIGHT: ProgressionRule = { type: 'add_weight' };

/**
 * Cycle-aware wave periodization.
 * Each cycle repeats the 6-week block structure with offsets shifted by −1,
 * so the effective target weight increases by one increment (+2.5kg) per cycle.
 *
 * Phases within each cycle:
 * - 'b1'  → Weeks 1-2 (build, +2.5kg/session)
 * - 'b1d' → Week 3   (deload, fixed weight = same as b1 start)
 * - 'b2'  → Weeks 4-6 (peak, +2.5kg/session, ends at cycle record)
 */
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
  readonly isDeadlift?: boolean;
}

function mainLift({
  exerciseId,
  cycle,
  phase,
  sets,
  reps,
  isDeadlift,
}: MainLiftOpts): ExerciseSlot {
  const isDeload = phase === 'b1d';
  return {
    id: `${exerciseId}-${cycle}${phase}`,
    exerciseId,
    tier: isDeadlift ? 't2' : 't1',
    stages: [{ sets, reps }],
    onSuccess: isDeload ? NO_CHANGE : ADD_WEIGHT,
    onUndefined: isDeload ? NO_CHANGE : ADD_WEIGHT,
    onMidStageFail: NO_CHANGE,
    onFinalStageFail: NO_CHANGE,
    startWeightKey: exerciseId,
    startWeightOffset: PHASE_OFFSETS[cycle][phase],
  };
}

function acc(exerciseId: string, tier: Tier, sets: number, reps: number): ExerciseSlot {
  return {
    id: exerciseId,
    exerciseId,
    tier,
    stages: [{ sets, reps }],
    onSuccess: NO_CHANGE,
    onMidStageFail: NO_CHANGE,
    onFinalStageFail: NO_CHANGE,
    startWeightKey: exerciseId,
  };
}

// ---------------------------------------------------------------------------
// Cycle day generator — 24 days per cycle, parameterized by cycle
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
        acc('press_franc', 't2', 4, 8),
        acc('ext_polea', 't3', 3, 12),
        acc('elev_lat', 't3', 4, 12),
        acc('elev_post', 't3', 3, 15),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1', sets: 1, reps: 5, isDeadlift: true }),
        acc('remo_bar', 't2', 4, 8),
        acc('jalon', 't2', 4, 10),
        acc('face_pull', 't3', 3, 15),
        acc('gemelo_pie', 't3', 4, 12),
        acc('gemelo_sent', 't3', 3, 15),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1', sets: 5, reps: 5 }),
        acc('apert', 't2', 3, 12),
        acc('cruces', 't3', 3, 12),
        acc('curl_bar', 't2', 3, 10),
        acc('curl_alt', 't3', 3, 12),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1', sets: 5, reps: 5 }),
        acc('prensa', 't2', 4, 10),
        acc('ext_quad', 't3', 3, 12),
        acc('curl_fem', 't3', 3, 12),
        acc('hip_thrust', 't2', 3, 10),
      ],
    },

    // --- Week 2 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b1', sets: 5, reps: 5 }),
        acc('press_franc', 't2', 4, 6),
        acc('ext_polea', 't3', 3, 10),
        acc('elev_lat', 't3', 4, 10),
        acc('elev_front', 't3', 3, 12),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1', sets: 1, reps: 5, isDeadlift: true }),
        acc('remo_bar', 't2', 4, 6),
        acc('jalon', 't2', 4, 8),
        acc('face_pull', 't3', 3, 12),
        acc('gemelo_pie', 't3', 4, 10),
        acc('gemelo_sent', 't3', 3, 12),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1', sets: 5, reps: 5 }),
        acc('apert', 't2', 3, 10),
        acc('cruces', 't3', 3, 10),
        acc('curl_bar', 't2', 3, 8),
        acc('curl_mart', 't3', 3, 10),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1', sets: 5, reps: 5 }),
        acc('prensa', 't2', 4, 8),
        acc('ext_quad', 't3', 3, 10),
        acc('curl_fem', 't3', 3, 10),
        acc('zancadas', 't2', 3, 10),
      ],
    },

    // --- Week 3 (deload) ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b1d', sets: 5, reps: 5 }),
        acc('press_franc', 't2', 5, 5),
        acc('ext_polea', 't3', 3, 8),
        acc('elev_lat', 't3', 3, 8),
        acc('elev_post', 't3', 3, 12),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b1d', sets: 1, reps: 5, isDeadlift: true }),
        acc('remo_bar', 't2', 5, 5),
        acc('jalon', 't2', 4, 6),
        acc('face_pull', 't3', 3, 10),
        acc('gemelo_pie', 't3', 5, 8),
        acc('gemelo_sent', 't3', 3, 10),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b1d', sets: 5, reps: 5 }),
        acc('apert', 't2', 4, 8),
        acc('cruces', 't3', 3, 8),
        acc('curl_bar', 't2', 4, 6),
        acc('curl_alt', 't3', 3, 8),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b1d', sets: 5, reps: 5 }),
        acc('prensa', 't2', 5, 6),
        acc('ext_quad', 't3', 4, 8),
        acc('curl_fem', 't3', 4, 8),
        acc('leg_press_gem', 't3', 4, 10),
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
        acc('press_franc', 't2', 4, 8),
        acc('ext_polea', 't3', 3, 12),
        acc('elev_lat', 't3', 4, 12),
        acc('elev_post', 't3', 3, 15),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3, isDeadlift: true }),
        acc('remo_bar', 't2', 4, 8),
        acc('jalon', 't2', 4, 10),
        acc('face_pull', 't3', 3, 15),
        acc('gemelo_pie', 't3', 4, 12),
        acc('gemelo_sent', 't3', 3, 15),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        acc('apert', 't2', 3, 12),
        acc('cruces', 't3', 3, 12),
        acc('curl_bar', 't2', 3, 10),
        acc('curl_alt', 't3', 3, 12),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        acc('prensa', 't2', 4, 10),
        acc('ext_quad', 't3', 3, 12),
        acc('curl_fem', 't3', 3, 12),
        acc('hip_thrust', 't2', 3, 10),
      ],
    },

    // --- Week 5 ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b2', sets: 3, reps: 3 }),
        acc('press_franc', 't2', 4, 6),
        acc('ext_polea', 't3', 3, 10),
        acc('elev_lat', 't3', 4, 10),
        acc('elev_front', 't3', 3, 12),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3, isDeadlift: true }),
        acc('remo_bar', 't2', 4, 6),
        acc('jalon', 't2', 4, 8),
        acc('face_pull', 't3', 3, 12),
        acc('gemelo_pie', 't3', 4, 10),
        acc('gemelo_sent', 't3', 3, 12),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        acc('apert', 't2', 3, 10),
        acc('cruces', 't3', 3, 10),
        acc('curl_bar', 't2', 3, 8),
        acc('curl_mart', 't3', 3, 10),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        acc('prensa', 't2', 4, 8),
        acc('ext_quad', 't3', 3, 10),
        acc('curl_fem', 't3', 3, 10),
        acc('zancadas', 't2', 3, 10),
      ],
    },

    // --- Week 6 (record) ---
    {
      name: 'Lun — Hombros/Tríceps',
      slots: [
        ml({ exerciseId: 'press_mil', phase: 'b2', sets: 3, reps: 3 }),
        acc('press_franc', 't2', 5, 5),
        acc('ext_polea', 't3', 3, 8),
        acc('elev_lat', 't3', 3, 8),
        acc('elev_post', 't3', 3, 12),
      ],
    },
    {
      name: 'Mar — Espalda/Gemelo',
      slots: [
        ml({ exerciseId: 'deadlift', phase: 'b2', sets: 1, reps: 3, isDeadlift: true }),
        acc('remo_bar', 't2', 5, 5),
        acc('jalon', 't2', 4, 6),
        acc('face_pull', 't3', 3, 10),
        acc('gemelo_pie', 't3', 5, 8),
        acc('gemelo_sent', 't3', 3, 10),
      ],
    },
    {
      name: 'Jue — Pecho/Bíceps',
      slots: [
        ml({ exerciseId: 'bench', phase: 'b2', sets: 3, reps: 3 }),
        acc('apert', 't2', 4, 8),
        acc('cruces', 't3', 3, 8),
        acc('curl_bar', 't2', 4, 6),
        acc('curl_alt', 't3', 3, 8),
      ],
    },
    {
      name: 'Vie — Pierna',
      slots: [
        ml({ exerciseId: 'squat', phase: 'b2', sets: 3, reps: 3 }),
        acc('prensa', 't2', 5, 6),
        acc('ext_quad', 't3', 4, 8),
        acc('curl_fem', 't3', 4, 8),
        acc('leg_press_gem', 't3', 4, 10),
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Nivel 7 Definition
// ---------------------------------------------------------------------------

/**
 * Nivel 7 — 12-week strength program by "nivel7" (musclecoop forum).
 *
 * Two 6-week cycles, each with Block 1 (5×5) and Block 2 (3×3).
 * 4 days/week: Lunes (Hombros/Tríceps), Martes (Espalda/Gemelo),
 *              Jueves (Pecho/Bíceps), Viernes (Pierna).
 *
 * Target-based periodization: user inputs the week-6 record weight.
 * Each cycle's wave: S1=build, S2=build, S3=deload, S4=peak, S5=peak, S6=record.
 * Cycle 2 repeats the pattern with the target shifted +2.5kg.
 * Accessories have no auto-progression (user adjusts manually).
 */
export const NIVEL7_DEFINITION: ProgramDefinition = {
  id: 'nivel7',
  name: 'Nivel 7',
  description:
    'Programa de fuerza de 12 semanas con periodización inversa. ' +
    'Configuras el récord objetivo (semana 6) y los pesos se calculan hacia atrás. ' +
    'Bloque 1 (5×5) con descarga en semana 3, Bloque 2 (3×3) culminando en récord. ' +
    'Ciclo 2 repite la onda con +2.5kg. ' +
    '4 días/semana: hombros/tríceps, espalda/gemelo, pecho/bíceps, pierna.',
  author: 'nivel7 (musclecoop)',
  version: 1,
  category: 'strength',
  source: 'preset',
  cycleLength: 48,
  totalWorkouts: 48,
  workoutsPerWeek: 4,
  exercises: {
    press_mil: { name: 'Press Militar' },
    bench: { name: 'Press Banca' },
    squat: { name: 'Sentadilla' },
    deadlift: { name: 'Peso Muerto' },
    press_franc: { name: 'Press Francés' },
    ext_polea: { name: 'Extensión Polea' },
    elev_lat: { name: 'Elevaciones Laterales' },
    elev_post: { name: 'Elevaciones Posteriores' },
    remo_bar: { name: 'Remo con Barra' },
    jalon: { name: 'Jalón al Pecho' },
    face_pull: { name: 'Face Pull' },
    gemelo_pie: { name: 'Gemelo de Pie' },
    gemelo_sent: { name: 'Gemelo Sentado' },
    apert: { name: 'Aperturas' },
    cruces: { name: 'Cruces en Polea' },
    curl_bar: { name: 'Curl con Barra' },
    curl_alt: { name: 'Curl Alterno' },
    curl_mart: { name: 'Curl Martillo' },
    prensa: { name: 'Prensa' },
    ext_quad: { name: 'Extensión Cuádriceps' },
    curl_fem: { name: 'Curl Femoral' },
    hip_thrust: { name: 'Hip Thrust' },
    zancadas: { name: 'Zancadas' },
    leg_press_gem: { name: 'Prensa Gemelo' },
    elev_front: { name: 'Elevaciones Frontales' },
  },
  configFields: [
    {
      key: 'press_mil',
      label: 'Press Militar (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
    },
    { key: 'bench', label: 'Press Banca (récord sem. 6)', type: 'weight', min: 2.5, step: 2.5 },
    { key: 'squat', label: 'Sentadilla (récord sem. 6)', type: 'weight', min: 2.5, step: 2.5 },
    {
      key: 'deadlift',
      label: 'Peso Muerto (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
    },
  ],
  weightIncrements: {
    press_mil: 2.5,
    bench: 2.5,
    squat: 2.5,
    deadlift: 2.5,
  },
  days: [...cycleDays('c1'), ...cycleDays('c2')],
};
