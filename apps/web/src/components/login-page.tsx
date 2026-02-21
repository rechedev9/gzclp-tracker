import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/auth-context';
import { sanitizeAuthError } from '@/lib/auth-errors';

export function LoginPage(): React.ReactNode {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleGoogleSuccess = async (credential: string): Promise<void> => {
    setError(null);
    const authError = await signInWithGoogle(credential);
    if (authError) {
      setError(sanitizeAuthError(authError.message));
    }
  };

  return (
    <div className="grain-overlay min-h-dvh flex flex-col bg-[var(--bg-body)]">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        {/* Logo + wordmark */}
        <div className="text-center mb-10">
          <img
            src="/logo.webp"
            alt="RSN logo"
            width={72}
            height={72}
            className="mx-auto mb-5 rounded-full"
            style={{ boxShadow: '0 0 32px rgba(200,168,78,0.25)' }}
          />
          <h1
            className="font-display leading-none mb-2"
            style={{ fontSize: 'clamp(26px, 5vw, 44px)', color: 'var(--text-header)' }}
          >
            The Real Hyperbolic Time Chamber
          </h1>
          <p
            className="font-mono text-[11px] tracking-[0.3em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Train smarter. Progress faster.
          </p>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-sm">
          <div
            className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden"
            style={{ boxShadow: '0 16px 60px rgba(0,0,0,0.6)' }}
          >
            {/* Gold accent bar */}
            <div
              className="h-[3px] w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--text-header), transparent)',
              }}
            />

            <div className="p-7 sm:p-8">
              {/* Card heading */}
              <p
                className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1"
                style={{ color: 'var(--text-header)' }}
              >
                Access your account
              </p>
              <h2
                className="font-display leading-none mb-6"
                style={{ fontSize: '28px', color: 'var(--text-main)' }}
              >
                Sign in to sync
                <br />
                your progress
              </h2>

              {/* Google OAuth button — full width container */}
              <div className="flex justify-center py-2">
                <GoogleLogin
                  onSuccess={({ credential }) => {
                    if (credential) void handleGoogleSuccess(credential);
                  }}
                  onError={() => {
                    setError('Google sign-in failed. Please try again.');
                  }}
                  theme="filled_black"
                  size="large"
                  width="280"
                />
              </div>

              {/* Error display */}
              {error && (
                <div
                  className="flex items-start gap-2 text-xs bg-[var(--bg-error)] border border-[var(--border-error)] px-3 py-2.5 mt-3"
                  style={{ color: 'var(--text-error)' }}
                >
                  <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                    &#9888;
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span
                  className="font-mono text-[10px] tracking-widest uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  or
                </span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div>

              {/* Continue without account */}
              <Link
                to="/app?view=programs"
                className="block w-full text-center py-2.5 border border-[var(--border-color)] font-mono text-[11px] tracking-wider uppercase transition-colors hover:border-[var(--text-header)] hover:text-[var(--text-header)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Continue without account
              </Link>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-5 mt-6">
            {[
              { icon: '☁', label: 'Cloud Sync' },
              { icon: '⚡', label: 'Auto-Save' },
              { icon: '🔒', label: 'Private' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--text-header)' }}>
                  {f.icon}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
