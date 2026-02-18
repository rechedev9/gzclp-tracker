import { Link } from 'react-router-dom';

export function NotFound(): React.ReactNode {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--bg-body)] px-6 text-center">
      <img src="/logo.webp" alt="RSN logo" width={64} height={64} className="rounded-full mb-6" />
      <h1 className="text-5xl font-extrabold text-[var(--text-header)] mb-3">404</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        This page doesn&apos;t exist. Maybe it was moved, or you mistyped the URL.
      </p>
      <Link
        to="/"
        className="px-6 py-3 text-xs font-bold border-2 border-[var(--btn-border)] bg-[var(--btn-hover-bg)] text-[var(--btn-hover-text)] hover:opacity-90 transition-all"
      >
        Go Home
      </Link>
    </div>
  );
}
