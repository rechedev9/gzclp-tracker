import { memo } from 'react';
import type { Tier, ResultValue } from '@gzclp/shared/types';

interface ResultCellProps {
  readonly index: number;
  readonly tier: Tier;
  readonly result?: ResultValue;
  readonly variant: 'table' | 'card';
  readonly onMark: (index: number, tier: Tier, value: ResultValue) => void;
  readonly onUndo: (index: number, tier: Tier) => void;
}

export const ResultCell = memo(function ResultCell({
  index,
  tier,
  result,
  variant,
  onMark,
  onUndo,
}: ResultCellProps): React.ReactNode {
  if (result) {
    const isSuccess = result === 'success';
    const badgeColor = isSuccess
      ? 'bg-[var(--bg-badge-ok)] border-[var(--border-badge-ok)] text-[var(--text-badge-ok)]'
      : 'bg-[var(--bg-badge-no)] border-[var(--border-badge-no)] text-[var(--text-badge-no)]';

    return (
      <button
        onClick={() => onUndo(index, tier)}
        aria-label={`Deshacer ${tier} ${isSuccess ? 'éxito' : 'fallo'}`}
        className={`px-3${variant === 'table' ? '.5' : ''} py-1${variant === 'table' ? '.5' : ''} text-[13px] font-extrabold cursor-pointer border-3 rounded-sm ${badgeColor} ${
          variant === 'table'
            ? 'group relative inline-block transition-transform hover:scale-110'
            : ''
        }`}
      >
        {isSuccess ? '\u2713' : '\u2717'}
        {variant === 'table' ? (
          <span className="absolute -top-5.5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap bg-[var(--bg-tooltip)] text-[var(--text-tooltip)] px-2 py-0.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            deshacer
          </span>
        ) : (
          <>
            {' '}
            <span className="text-[10px] font-normal opacity-70">deshacer</span>
          </>
        )}
      </button>
    );
  }

  const isCard = variant === 'card';

  return (
    <div className={`flex ${isCard ? 'gap-2.5' : 'gap-1 justify-center'}`}>
      <button
        onClick={() => onMark(index, tier, 'success')}
        aria-label={`Marcar ${tier} éxito`}
        className={`${isCard ? 'min-w-[48px] min-h-[48px] px-3 py-2 text-base' : 'px-3.5 py-2 text-sm'} font-extrabold border-2 border-[var(--border-badge-ok)] bg-transparent text-[var(--text-badge-ok)] rounded-sm cursor-pointer transition-all hover:bg-[var(--bg-badge-ok)]`}
      >
        &#10003;
      </button>
      <button
        onClick={() => onMark(index, tier, 'fail')}
        aria-label={`Marcar ${tier} fallo`}
        className={`${isCard ? 'min-w-[48px] min-h-[48px] px-3 py-2 text-base' : 'px-3.5 py-2 text-sm'} font-extrabold border-2 border-[var(--border-badge-no)] bg-transparent text-[var(--text-badge-no)] rounded-sm cursor-pointer transition-all hover:bg-[var(--bg-badge-no)]`}
      >
        &#10007;
      </button>
    </div>
  );
});
