import type { ProgramDefinition } from '@gzclp/shared/types/program';
import type { WorkoutRow } from '@gzclp/shared/types';

// ---------------------------------------------------------------------------
// Definition-derived helpers
// ---------------------------------------------------------------------------

function deriveNames(definition: ProgramDefinition): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const [id, ex] of Object.entries(definition.exercises)) {
    map[id] = ex.name;
  }
  return map;
}

function deriveStages(
  definition: ProgramDefinition,
  tier: string
): readonly { readonly sets: number; readonly reps: number }[] {
  for (const day of definition.days) {
    for (const slot of day.slots) {
      if (slot.tier === tier) {
        return slot.stages.map((s) => ({ sets: s.sets, reps: s.reps }));
      }
    }
  }
  return [{ sets: 5, reps: 3 }];
}

function deriveT3Constants(definition: ProgramDefinition): {
  sets: number;
  prescribedReps: number;
} {
  for (const day of definition.days) {
    for (const slot of day.slots) {
      if (slot.tier === 't3' && slot.stages.length > 0) {
        return { sets: slot.stages[0].sets, prescribedReps: slot.stages[0].reps };
      }
    }
  }
  return { sets: 3, prescribedReps: 15 };
}

export interface CalendarEventOptions {
  readonly date?: string;
  readonly startHour?: number;
  readonly durationMinutes?: number;
}

export interface CalendarEvent {
  readonly calendarUrl: string;
  readonly title: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

/** Format a Date as YYYY-MM-DD. */
function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date as YYYYMMDDTHHmmSS for Google Calendar URL (local time, no Z). */
function formatGoogleDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${sec}`;
}

/**
 * Build a Google Calendar URL for a workout row.
 * Returns a pre-filled event creation link — no OAuth or API keys needed.
 */
export function buildGoogleCalendarUrl(
  row: WorkoutRow,
  definition: ProgramDefinition,
  options?: CalendarEventOptions
): CalendarEvent {
  const startHour = options?.startHour ?? 7;
  const durationMinutes = options?.durationMinutes ?? 60;

  const names = deriveNames(definition);
  const t1Stages = deriveStages(definition, 't1');
  const t2Stages = deriveStages(definition, 't2');
  const t3Constants = deriveT3Constants(definition);

  let dateStr: string;
  if (options?.date) {
    dateStr = options.date;
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = formatDateISO(tomorrow);
  }

  const title =
    `GZCLP ${row.dayName} — ` +
    `${names[row.t1Exercise] ?? row.t1Exercise} / ${names[row.t2Exercise] ?? row.t2Exercise} / ${names[row.t3Exercise] ?? row.t3Exercise}`;

  const t1Stage = t1Stages[row.t1Stage] ?? t1Stages[0];
  const t2Stage = t2Stages[row.t2Stage] ?? t2Stages[0];
  const description = [
    `Entrenamiento #${row.index + 1} — ${row.dayName}`,
    '',
    `T1: ${names[row.t1Exercise] ?? row.t1Exercise} — ${row.t1Weight}kg (${t1Stage.sets}×${t1Stage.reps}, Etapa ${row.t1Stage + 1})`,
    `T2: ${names[row.t2Exercise] ?? row.t2Exercise} — ${row.t2Weight}kg (${t2Stage.sets}×${t2Stage.reps}, Etapa ${row.t2Stage + 1})`,
    `T3: ${names[row.t3Exercise] ?? row.t3Exercise} — ${row.t3Weight}kg (${t3Constants.sets}×${t3Constants.prescribedReps})`,
  ].join('\n');

  const startDate = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00`);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const calendarUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}` +
    `&details=${encodeURIComponent(description)}`;

  const endHour = endDate.getHours();
  const endMinute = endDate.getMinutes();

  return {
    calendarUrl,
    title,
    date: dateStr,
    startTime: `${String(startHour).padStart(2, '0')}:00`,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
  };
}
