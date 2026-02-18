import { memo } from 'react';

interface AmrapInputProps {
  readonly value: number | undefined;
  readonly onChange: (reps: number | undefined) => void;
  readonly variant?: 'table' | 'card';
}

export const AmrapInput = memo(function AmrapInput({
  value,
  onChange,
  variant = 'table',
}: AmrapInputProps): React.ReactNode {
  const isCard = variant === 'card';

  return (
    <input
      type="number"
      inputMode="numeric"
      min="0"
      max="99"
      placeholder="—"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0));
      }}
      className={`${isCard ? 'w-12 px-1.5 py-1 text-[12px]' : 'w-10 px-1 py-0.5 text-[11px]'} text-center font-bold bg-transparent border border-[var(--border-color)] text-[var(--text-main)] focus:border-[var(--fill-progress)] focus:outline-none tabular-nums`}
      title="AMRAP reps"
    />
  );
});
