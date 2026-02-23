import { describe, it, expect } from 'bun:test';
import { buildGoogleCalendarUrl } from './calendar';
import { computeProgram } from '@gzclp/shared/engine';
import { DEFAULT_WEIGHTS } from '../../test/helpers/fixtures';

const rows = computeProgram(DEFAULT_WEIGHTS, {});

describe('buildGoogleCalendarUrl', () => {
  describe('URL format', () => {
    it('returns a valid Google Calendar URL with correct base', () => {
      const result = buildGoogleCalendarUrl(rows[0], { date: '2026-03-01' });

      expect(result.calendarUrl).toStartWith(
        'https://calendar.google.com/calendar/render?action=TEMPLATE'
      );
    });

    it('includes encoded text, dates, and details params', () => {
      const result = buildGoogleCalendarUrl(rows[0], { date: '2026-03-01' });

      expect(result.calendarUrl).toContain('&text=');
      expect(result.calendarUrl).toContain('&dates=');
      expect(result.calendarUrl).toContain('&details=');
    });
  });

  describe('title', () => {
    it('contains the day name and all three exercise names', () => {
      const result = buildGoogleCalendarUrl(rows[0], { date: '2026-03-01' });

      expect(result.title).toBe('GZCLP Day 1 — Squat / Bench Press / Lat Pulldown');
    });

    it('reflects the correct exercises for day 2', () => {
      const result = buildGoogleCalendarUrl(rows[1], { date: '2026-03-01' });

      expect(result.title).toBe('GZCLP Day 2 — OHP / Deadlift / DB Row');
    });
  });

  describe('description', () => {
    it('contains tier details with weights, sets×reps, and stages', () => {
      const { calendarUrl } = buildGoogleCalendarUrl(rows[0], { date: '2026-03-01' });
      const detailsParam = new URL(calendarUrl).searchParams.get('details') ?? '';

      expect(detailsParam).toContain('T1: Squat');
      expect(detailsParam).toContain('60kg');
      expect(detailsParam).toContain('5×3');
      expect(detailsParam).toContain('Stage 1');
      expect(detailsParam).toContain('T2: Bench Press');
      expect(detailsParam).toContain('T3: Lat Pulldown');
      expect(detailsParam).toContain('3×15');
    });
  });

  describe('date and time', () => {
    it('formats date range correctly for custom inputs', () => {
      const result = buildGoogleCalendarUrl(rows[0], {
        date: '2026-06-15',
        startHour: 9,
        durationMinutes: 90,
      });

      expect(result.date).toBe('2026-06-15');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('10:30');
      expect(result.calendarUrl).toContain('20260615T090000/20260615T103000');
    });

    it('defaults to 07:00 start and 60 min duration', () => {
      const result = buildGoogleCalendarUrl(rows[0], { date: '2026-03-01' });

      expect(result.startTime).toBe('07:00');
      expect(result.endTime).toBe('08:00');
      expect(result.calendarUrl).toContain('20260301T070000/20260301T080000');
    });

    it('defaults to tomorrow when no date is provided', () => {
      const result = buildGoogleCalendarUrl(rows[0]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = tomorrow.toISOString().slice(0, 10);

      expect(result.date).toBe(expected);
    });
  });

  describe('stages', () => {
    it('handles T1 stage 2 correctly', () => {
      const row = { ...rows[0], t1Stage: 1 };
      const { calendarUrl } = buildGoogleCalendarUrl(row, { date: '2026-03-01' });
      const details = new URL(calendarUrl).searchParams.get('details') ?? '';

      expect(details).toContain('6×2');
      expect(details).toContain('Stage 2');
    });

    it('handles T1 stage 3 correctly', () => {
      const row = { ...rows[0], t1Stage: 2 };
      const { calendarUrl } = buildGoogleCalendarUrl(row, { date: '2026-03-01' });
      const details = new URL(calendarUrl).searchParams.get('details') ?? '';

      expect(details).toContain('10×1');
      expect(details).toContain('Stage 3');
    });
  });
});
