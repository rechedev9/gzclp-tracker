const RPE_VALUES = [6, 7, 8, 9, 10] as const;

interface RpeInputProps {
  readonly value: number | undefined;
  readonly onChange: (rpe: number | undefined) => void;
  readonly label: string;
}

export function RpeInput({ value, onChange, label }: RpeInputProps): React.ReactNode {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[var(--text-muted)] mr-0.5">{label} RPE</span>
      {RPE_VALUES.map((rpe) => {
        const isActive = value === rpe;
        return (
          <button
            key={rpe}
            type="button"
            aria-label={`RPE ${rpe}`}
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? undefined : rpe)}
            className={`w-11 h-11 text-xs font-bold border cursor-pointer transition-all duration-150 active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--fill-progress)] focus-visible:outline-none ${
              isActive
                ? 'bg-[var(--fill-progress)] text-white border-[var(--fill-progress)] shadow-[0_0_10px_rgba(232,170,32,0.25)]'
                : 'bg-transparent text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]'
            }`}
          >
            {rpe}
          </button>
        );
      })}
    </div>
  );
}
