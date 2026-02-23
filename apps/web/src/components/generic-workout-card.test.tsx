import { describe, it, expect, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { GenericWorkoutCard } from './generic-workout-card';
import type { GenericWorkoutRow, ResultValue } from '@gzclp/shared/types';

// ---------------------------------------------------------------------------
// GenericWorkoutCard — T1 hero class and ARIA tests (REQ-CARD-003, REQ-CARD-004)
// ---------------------------------------------------------------------------

function buildRow(overrides?: Partial<GenericWorkoutRow>): GenericWorkoutRow {
  return {
    index: 0,
    dayName: 'Día 1',
    isChanged: false,
    slots: [
      {
        slotId: 'slot-t1',
        exerciseId: 'squat',
        exerciseName: 'Sentadilla',
        tier: 't1',
        weight: 60,
        stage: 0,
        sets: 5,
        reps: 3,
        isAmrap: false,
        result: undefined,
        amrapReps: undefined,
        rpe: undefined,
        isChanged: false,
      },
      {
        slotId: 'slot-t2',
        exerciseId: 'bench',
        exerciseName: 'Press Banca',
        tier: 't2',
        weight: 40,
        stage: 0,
        sets: 3,
        reps: 10,
        isAmrap: false,
        result: undefined,
        amrapReps: undefined,
        rpe: undefined,
        isChanged: false,
      },
    ],
    ...overrides,
  };
}

function renderCard(overrides?: Partial<GenericWorkoutRow>): ReturnType<typeof render> {
  const onMark = mock<(workoutIndex: number, slotId: string, value: ResultValue) => void>();
  const onSetAmrapReps =
    mock<(workoutIndex: number, slotId: string, reps: number | undefined) => void>();
  const onUndo = mock<(workoutIndex: number, slotId: string) => void>();

  return render(
    <GenericWorkoutCard
      row={buildRow(overrides)}
      isCurrent={false}
      onMark={onMark}
      onSetAmrapReps={onSetAmrapReps}
      onUndo={onUndo}
    />
  );
}

describe('GenericWorkoutCard', () => {
  describe('T1 weight hero treatment (REQ-CARD-003)', () => {
    it('should render T1 weight with font-display-data class', () => {
      const { container } = renderCard();

      const weightEl = container.querySelector('.font-display-data');

      expect(weightEl).not.toBeNull();
    });

    it('should render T1 weight with fill-progress color class', () => {
      const { container } = renderCard();

      const weightEl = container.querySelector('.font-display-data');

      expect(weightEl?.className).toContain('text-[var(--fill-progress)]');
    });

    it('should NOT render T2 weight with font-display-data class', () => {
      const { container } = renderCard();

      // Only 1 weight element should have font-display-data (the T1 one)
      const displayDataEls = container.querySelectorAll('.font-display-data');

      expect(displayDataEls.length).toBe(1);
    });
  });

  describe('card header workout number (REQ-CARD-004)', () => {
    it('should render #N header with font-display class', () => {
      const { container } = renderCard({ index: 2 });

      const header = container.querySelector('.font-display.text-2xl');

      expect(header).not.toBeNull();
      expect(header?.textContent).toContain('#3');
    });
  });

  describe('ARIA labels (REQ-CARD-004)', () => {
    it('should render success buttons with accessible role', () => {
      renderCard();

      const successButtons = screen.getAllByRole('button', { name: /éxito/i });

      expect(successButtons.length).toBeGreaterThan(0);
    });
  });
});
