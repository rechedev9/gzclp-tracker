import type { ProgramDefinition } from '../types/program';
import { CYCLE_1_DAYS, CYCLE_2_DAYS } from './nivel7-days/day-a';

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
 * Main lifts: target-based wave periodization (user inputs week-6 record).
 * Accessories: double progression 3×8-12 (+2.5kg when 3×12 completed, reset to 3×8).
 * Cycle 2 repeats the main lift pattern with the target shifted +2.5kg.
 */
export const NIVEL7_DEFINITION: ProgramDefinition = {
  id: 'nivel7',
  name: 'Nivel 7',
  description:
    'Programa de fuerza de 12 semanas con periodización inversa. ' +
    'Configuras el récord objetivo (semana 6) y los pesos se calculan hacia atrás. ' +
    'Bloque 1 (5×5) con descarga en semana 3, Bloque 2 (3×3) culminando en récord. ' +
    'Ciclo 2 repite la onda con +2.5kg. Accesorios con doble progresión 3×8-12. ' +
    '4 días/semana: hombros/tríceps, espalda/gemelo, pecho/bíceps, pierna.',
  author: 'nivel7 (musclecoop)',
  version: 1,
  category: 'strength',
  source: 'preset',
  configTitle: 'Récords Objetivo (kg)',
  configDescription:
    'Configura el récord que quieres alcanzar en la semana 6 para los levantamientos principales, ' +
    'y el peso inicial de los accesorios.',
  configEditTitle: 'Editar Récords Objetivo (kg)',
  configEditDescription:
    'Actualiza tus récords objetivo — el programa se recalculará con los nuevos valores.',
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
    // --- Main lifts (week-6 record targets) ---
    {
      key: 'press_mil',
      label: 'Press Militar (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
      group: 'Objetivos principales (sem. 6)',
    },
    {
      key: 'bench',
      label: 'Press Banca (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
      group: 'Objetivos principales (sem. 6)',
    },
    {
      key: 'squat',
      label: 'Sentadilla (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
      group: 'Objetivos principales (sem. 6)',
    },
    {
      key: 'deadlift',
      label: 'Peso Muerto (récord sem. 6)',
      type: 'weight',
      min: 2.5,
      step: 2.5,
      group: 'Objetivos principales (sem. 6)',
    },

    // --- Hombros / Tríceps ---
    {
      key: 'press_franc',
      label: 'Press Francés',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Hombros / Tríceps',
    },
    {
      key: 'ext_polea',
      label: 'Extensión Polea',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Hombros / Tríceps',
    },
    {
      key: 'elev_lat',
      label: 'Elevaciones Laterales',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Hombros / Tríceps',
    },
    {
      key: 'elev_post',
      label: 'Elevaciones Posteriores',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Hombros / Tríceps',
    },
    {
      key: 'elev_front',
      label: 'Elevaciones Frontales',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Hombros / Tríceps',
    },

    // --- Espalda / Gemelo ---
    {
      key: 'remo_bar',
      label: 'Remo con Barra',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Espalda / Gemelo',
    },
    {
      key: 'jalon',
      label: 'Jalón al Pecho',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Espalda / Gemelo',
    },
    {
      key: 'face_pull',
      label: 'Face Pull',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Espalda / Gemelo',
    },
    {
      key: 'gemelo_pie',
      label: 'Gemelo de Pie',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Espalda / Gemelo',
    },
    {
      key: 'gemelo_sent',
      label: 'Gemelo Sentado',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Espalda / Gemelo',
    },

    // --- Pecho / Bíceps ---
    {
      key: 'apert',
      label: 'Aperturas',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pecho / Bíceps',
    },
    {
      key: 'cruces',
      label: 'Cruces en Polea',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pecho / Bíceps',
    },
    {
      key: 'curl_bar',
      label: 'Curl con Barra',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pecho / Bíceps',
    },
    {
      key: 'curl_alt',
      label: 'Curl Alterno',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pecho / Bíceps',
    },
    {
      key: 'curl_mart',
      label: 'Curl Martillo',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pecho / Bíceps',
    },

    // --- Pierna ---
    {
      key: 'prensa',
      label: 'Prensa',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
    {
      key: 'ext_quad',
      label: 'Extensión Cuádriceps',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
    {
      key: 'curl_fem',
      label: 'Curl Femoral',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
    {
      key: 'hip_thrust',
      label: 'Hip Thrust',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
    {
      key: 'zancadas',
      label: 'Zancadas',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
    {
      key: 'leg_press_gem',
      label: 'Prensa Gemelo',
      type: 'weight',
      min: 0,
      step: 0.5,
      group: 'Pierna',
    },
  ],
  weightIncrements: {
    press_mil: 2.5,
    bench: 2.5,
    squat: 2.5,
    deadlift: 2.5,
  },
  days: [...CYCLE_1_DAYS, ...CYCLE_2_DAYS],
};
