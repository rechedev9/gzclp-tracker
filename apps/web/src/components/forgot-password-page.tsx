import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api-functions';
import { isRecord } from '@gzclp/shared/type-guards';
import { Button } from './button';

export function ForgotPasswordPage(): React.ReactNode {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const message =
        isRecord(data) && typeof data.message === 'string'
          ? data.message
          : 'If that email is registered, you will receive a reset link.';
      setSuccess(message);
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
          Reset your password
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-[420px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h2 className="text-lg font-bold text-[var(--text-header)] mb-1">Forgot password</h2>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {success ? (
              <div className="flex items-start gap-2 text-xs text-[var(--text-badge-ok)] bg-[var(--bg-badge-ok)] border border-[var(--border-badge-ok)] px-3 py-2.5">
                <span>{success}</span>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-[11px] font-bold uppercase tracking-wide text-[var(--text-label)] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-[var(--text-error)] bg-[var(--bg-error)] border border-[var(--border-error)] px-3 py-2.5">
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            )}

            <p className="text-xs text-[var(--text-muted)] text-center mt-5">
              Remember your password?{' '}
              <Link to="/login" className="text-[var(--btn-text)] font-bold underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
