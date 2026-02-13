'use client';

import { NAMES } from '@/lib/program';
import type { WorkoutRow as WorkoutRowType, Tier, ResultValue } from '@/types';
import { StageTag } from './stage-tag';
import { ResultCell } from './result-cell';
import { AmrapInput } from './amrap-input';

interface WorkoutRowCardProps {
  row: WorkoutRowType;
  isCurrent: boolean;
  onMark: (index: number, tier: Tier, value: ResultValue) => void;
  onSetAmrapReps: (index: number, field: 't1Reps' | 't3Reps', reps: number | undefined) => void;
  onUndo: (index: number, tier: Tier) => void;
}

function TierSection({
  label,
  exercise,
  weight,
  scheme,
  stage,
  showStage,
  index,
  tier,
  result,
  amrapReps,
  onSetAmrapReps,
  onMark,
  onUndo,
}: {
  label: string;
  exercise: string;
  weight: number;
  scheme: string;
  stage?: number;
  showStage: boolean;
  index: number;
  tier: Tier;
  result?: ResultValue;
  amrapReps?: number;
  onSetAmrapReps?: (reps: number | undefined) => void;
  onMark: (index: number, tier: Tier, value: ResultValue) => void;
  onUndo: (index: number, tier: Tier) => void;
}) {
  return (
    <div className="py-2 border-b border-[var(--border-light)] last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase text-[var(--text-muted)]">{label}</div>
          <div className="text-[13px] font-bold truncate">{exercise}</div>
        </div>
        <div
          className="text-center shrink-0"
          title={tier === 't3' ? 'T3 weight increases when AMRAP set reaches 25+ reps' : undefined}
        >
          <div className="text-[15px] font-extrabold tabular-nums">{weight} kg</div>
          <div className="text-[12px] font-semibold text-[var(--text-muted)]">
            {scheme}
            {showStage && stage !== undefined && (
              <>
                {' '}
                <StageTag stage={stage} size="md" />
              </>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <ResultCell
            index={index}
            tier={tier}
            result={result}
            variant="card"
            onMark={onMark}
            onUndo={onUndo}
          />
        </div>
      </div>
      {result && onSetAmrapReps && (
        <div className="mt-1.5 flex items-center gap-2 pl-1">
          <span className="text-[10px] text-[var(--text-muted)]">AMRAP reps:</span>
          <AmrapInput value={amrapReps} onChange={onSetAmrapReps} variant="card" />
        </div>
      )}
    </div>
  );
}

export function WorkoutRowCard({
  row,
  isCurrent,
  onMark,
  onSetAmrapReps,
  onUndo,
}: WorkoutRowCardProps) {
  const allDone = row.result.t1 && row.result.t2 && row.result.t3;

  return (
    <div
      {...(isCurrent ? { 'data-current-row': true } : {})}
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] p-3 sm:p-4 mb-3 ${
        allDone ? 'opacity-40' : ''
      } ${isCurrent ? 'border-l-4 border-l-[var(--fill-progress)]' : ''} ${
        row.isChanged && !allDone ? 'bg-[var(--bg-changed)]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[15px] font-extrabold">#{row.index + 1}</span>
        <span className="text-xs font-semibold text-[var(--text-muted)]">{row.dayName}</span>
      </div>

      <div data-testid={`t1-result-${row.index}`}>
        <TierSection
          label="T1 — Main Lift"
          exercise={NAMES[row.t1Exercise]}
          weight={row.t1Weight}
          scheme={`${row.t1Sets}\u00d7${row.t1Reps}`}
          stage={row.t1Stage}
          showStage={true}
          index={row.index}
          tier="t1"
          result={row.result.t1}
          amrapReps={row.result.t1Reps}
          onSetAmrapReps={(reps) => onSetAmrapReps(row.index, 't1Reps', reps)}
          onMark={onMark}
          onUndo={onUndo}
        />
      </div>
      <div data-testid={`t2-result-${row.index}`}>
        <TierSection
          label="T2 — Secondary"
          exercise={NAMES[row.t2Exercise]}
          weight={row.t2Weight}
          scheme={`${row.t2Sets}\u00d7${row.t2Reps}`}
          stage={row.t2Stage}
          showStage={true}
          index={row.index}
          tier="t2"
          result={row.result.t2}
          onMark={onMark}
          onUndo={onUndo}
        />
      </div>
      <div data-testid={`t3-result-${row.index}`}>
        <TierSection
          label="T3 — Accessory"
          exercise={NAMES[row.t3Exercise]}
          weight={row.t3Weight}
          scheme="3&times;15"
          showStage={false}
          index={row.index}
          tier="t3"
          result={row.result.t3}
          amrapReps={row.result.t3Reps}
          onSetAmrapReps={(reps) => onSetAmrapReps(row.index, 't3Reps', reps)}
          onMark={onMark}
          onUndo={onUndo}
        />
      </div>
    </div>
  );
}
