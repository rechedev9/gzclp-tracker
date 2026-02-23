interface ProfileStatCardProps {
  readonly value: string;
  readonly label: string;
  readonly sublabel?: string;
  readonly accent?: boolean;
  readonly badge?: string;
  readonly badgeVariant?: 'success' | 'neutral';
  readonly progress?: {
    readonly value: number;
    readonly label: string;
  };
}

const BADGE_STYLES = {
  success: 'bg-[var(--bg-badge-ok)] border-[var(--border-badge-ok)] text-[var(--text-badge-ok)]',
  neutral: 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]',
} as const;

export function ProfileStatCard({
  value,
  label,
  sublabel,
  accent,
  badge,
  badgeVariant = 'neutral',
  progress,
}: ProfileStatCardProps): React.ReactNode {
  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] p-4 sm:p-5${accent ? ' border-l-2 border-l-[var(--text-header)]' : ''}`}
    >
      <div className="flex items-baseline gap-2">
        <p className="font-display-data text-4xl sm:text-5xl text-[var(--text-header)] leading-none">
          {value}
        </p>
        {badge && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 border rounded-sm ${BADGE_STYLES[badgeVariant]}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-[var(--text-muted)] mt-1.5 uppercase tracking-wide">
        {label}
      </p>
      {sublabel && (
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 opacity-70">{sublabel}</p>
      )}
      {progress && (
        <div
          className="h-1.5 bg-[var(--bg-progress)] overflow-hidden mt-2"
          role="progressbar"
          aria-valuenow={progress.value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progress.label}
        >
          <div
            className="h-full bg-[var(--fill-progress)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
          />
        </div>
      )}
    </div>
  );
}
