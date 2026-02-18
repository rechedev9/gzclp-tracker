import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api-functions';
import { isRecord } from '@gzclp/shared/type-guards';
import { Button } from './button';

export function ResetPasswordPage(): React.ReactNode {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      if (isRecord(data) && typeof data.message === 'string') {
        void navigate('/login', { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 min-h-[48px] text-sm bg-[var(--bg-body)] border-2 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--btn-border)] focus:outline-none transition-colors';

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">
      <header className="text-center py-8 sm:py-12 px-5 bg-[var(--bg-header)]">
        <img
          src="/logo.webp"
          alt="Logo"
          width={80}
          height={80}
          className="mx-auto mb-3 rounded-full"
        />
        <h1 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-[var(--text-header)] mb-1.5">
          Set a new password
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-[420px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h2 className="text-lg font-bold text-[var(--text-header)] mb-1">New password</h2>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Choose a strong password with at least 8 characters.
            </p>

            {!token && (
              <div className="flex items-start gap-2 text-xs text-[var(--text-error)] bg-[var(--bg-error)] border border-[var(--border-error)] px-3 py-2.5 mb-3">
                <span>
                  Invalid or missing reset token. Please{' '}
                  <a href="/forgot-password" className="underline font-bold">
                    request a new link
                  </a>
                  .
                </span>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="reset-password"
                  className="block text-[11px] font-bold uppercase tracking-wide text-[var(--text-label)] mb-1.5"
                >
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-[var(--text-error)] bg-[var(--bg-error)] border border-[var(--border-error)] px-3 py-2.5">
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" disabled={submitting || !token}>
                {submitting ? 'Saving...' : 'Set new password'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
