'use client';

import { NAMES } from '@/lib/program';
import type { WorkoutRow as WorkoutRowType, Tier, ResultValue } from '@/types';
import { StageTag } from './stage-tag';
import { ResultCell } from './result-cell';
import { AmrapInput } from './amrap-input';

interface WorkoutRowProps {
  row: WorkoutRowType;
  isCurrent: boolean;
  onMark: (index: number, tier: Tier, value: ResultValue) => void;
  onSetAmrapReps: (index: number, field: 't1Reps' | 't3Reps', reps: number | undefined) => void;
  onUndo: (index: number, tier: Tier) => void;
}

export function WorkoutRow({ row, isCurrent, onMark, onSetAmrapReps, onUndo }: WorkoutRowProps) {
  const allDone = row.result.t1 && row.result.t2 && row.result.t3;

  const rowClasses = [
    'transition-colors',
    allDone ? 'opacity-40 hover:opacity-70' : '',
    isCurrent ? 'border-l-4 border-l-[var(--fill-progress)]' : '',
    row.isChanged && !allDone ? '[&>td]:!bg-[var(--bg-changed)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr
      {...(isCurrent ? { 'data-current-row': true } : {})}
      className={`${rowClasses} hover:bg-[var(--bg-hover-row)]`}
    >
      <td className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-extrabold text-[15px]">
        {row.index + 1}
      </td>
      <td className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-semibold text-xs text-[var(--text-muted)]">
        {row.dayName}
      </td>
      {/* T1 */}
      <td className="border border-[var(--border-light)] px-2 py-3 text-left align-middle font-bold text-[13px]">
        {NAMES[row.t1Exercise]}
      </td>
      <td
        data-testid={`t1-weight-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-extrabold text-[15px] tabular-nums"
      >
        {row.t1Weight}
      </td>
      <td
        data-testid={`t1-scheme-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-semibold text-[13px]"
      >
        {row.t1Sets}&times;{row.t1Reps}
        <br />
        <StageTag stage={row.t1Stage} size="md" />
      </td>
      <td
        data-testid={`t1-result-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle"
      >
        <ResultCell
          index={row.index}
          tier="t1"
          result={row.result.t1}
          variant="table"
          onMark={onMark}
          onUndo={onUndo}
        />
        {row.result.t1 && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">AMRAP</span>
            <AmrapInput
              value={row.result.t1Reps}
              onChange={(reps) => onSetAmrapReps(row.index, 't1Reps', reps)}
            />
          </div>
        )}
      </td>
      {/* T2 */}
      <td className="border border-[var(--border-light)] px-2 py-3 text-left align-middle font-bold text-[13px]">
        {NAMES[row.t2Exercise]}
      </td>
      <td
        data-testid={`t2-weight-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-extrabold text-[15px] tabular-nums"
      >
        {row.t2Weight}
      </td>
      <td
        data-testid={`t2-scheme-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-semibold text-[13px]"
      >
        {row.t2Sets}&times;{row.t2Reps}
        <br />
        <StageTag stage={row.t2Stage} size="md" />
      </td>
      <td
        data-testid={`t2-result-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle"
      >
        <ResultCell
          index={row.index}
          tier="t2"
          result={row.result.t2}
          variant="table"
          onMark={onMark}
          onUndo={onUndo}
        />
      </td>
      {/* T3 */}
      <td className="border border-[var(--border-light)] px-2 py-3 text-left align-middle font-bold text-[13px]">
        {NAMES[row.t3Exercise]}
      </td>
      <td
        data-testid={`t3-weight-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle font-extrabold text-[15px] tabular-nums"
        title="T3 weight increases when AMRAP set reaches 25+ reps"
      >
        {row.t3Weight}
        <br />
        <span className="text-[10px] text-[var(--text-muted)] font-normal">3&times;15</span>
      </td>
      <td
        data-testid={`t3-result-${row.index}`}
        className="border border-[var(--border-light)] px-2 py-3 text-center align-middle"
      >
        <ResultCell
          index={row.index}
          tier="t3"
          result={row.result.t3}
          variant="table"
          onMark={onMark}
          onUndo={onUndo}
        />
        {row.result.t3 && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">AMRAP</span>
            <AmrapInput
              value={row.result.t3Reps}
              onChange={(reps) => onSetAmrapReps(row.index, 't3Reps', reps)}
            />
          </div>
        )}
      </td>
    </tr>
  );
}
