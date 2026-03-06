import type { ReactNode } from 'react';
import type { ResultValue } from '@gzclp/shared/types';

interface SetIndicatorsProps {
  readonly sets: number;
  readonly result: ResultValue | undefined;
  readonly isAmrap: boolean;
}

/**
 * Renders a row of circle indicators representing the set count for a slot.
 * All circles share the same visual state (pending/success/fail) because
 * results are tracked at the slot level, not per-set.
 */
export function SetIndicators({ sets, result, isAmrap }: SetIndicatorsProps): ReactNode {
  if (sets <= 0) return null;

  const colorClass =
    result === undefined
      ? 'border-rule bg-transparent'
      : result === 'success'
        ? 'border-ok bg-ok'
        : 'border-fail bg-fail';

  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-label={`${sets} series`}>
      {Array.from({ length: sets }, (_, i) => {
        const isLast = i === sets - 1;
        const showAmrapMark = isAmrap && isLast;

        return (
          <span key={i} className={`relative w-5 h-5 rounded-full border-2 ${colorClass}`}>
            {showAmrapMark && (
              <span className="absolute -top-1.5 -right-1.5 text-2xs font-bold text-accent">+</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
