import { NAMES, T1_STAGES, T2_STAGES, T3_SETS, T3_PRESCRIBED_REPS } from '@gzclp/shared/program';
import type { WorkoutRow } from '@gzclp/shared/types';

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
  options?: CalendarEventOptions
): CalendarEvent {
  const startHour = options?.startHour ?? 7;
  const durationMinutes = options?.durationMinutes ?? 60;

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
    `${NAMES[row.t1Exercise]} / ${NAMES[row.t2Exercise]} / ${NAMES[row.t3Exercise]}`;

  const t1Stage = T1_STAGES[row.t1Stage] ?? T1_STAGES[0];
  const t2Stage = T2_STAGES[row.t2Stage] ?? T2_STAGES[0];
  const description = [
    `Workout #${row.index + 1} — ${row.dayName}`,
    '',
    `T1: ${NAMES[row.t1Exercise]} — ${row.t1Weight}kg (${t1Stage.sets}×${t1Stage.reps}, Stage ${row.t1Stage + 1})`,
    `T2: ${NAMES[row.t2Exercise]} — ${row.t2Weight}kg (${t2Stage.sets}×${t2Stage.reps}, Stage ${row.t2Stage + 1})`,
    `T3: ${NAMES[row.t3Exercise]} — ${row.t3Weight}kg (${T3_SETS}×${T3_PRESCRIBED_REPS})`,
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
