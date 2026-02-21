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
    <div className="grain-overlay min-h-dvh flex flex-col items-center justify-center bg-[var(--bg-body)] px-5 py-12 relative overflow-hidden">
      {/* Ambient gold glow — top center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(200,168,78,0.13) 0%, transparent 100%)',
        }}
      />

      {/* Logo with diffuse glow halo */}
      <div className="relative mb-8">
        <div
          aria-hidden="true"
          className="absolute rounded-full blur-2xl pointer-events-none"
          style={{ inset: '-18px', background: 'rgba(200,168,78,0.22)' }}
        />
        <img
          src="/logo.webp"
          alt="RSN logo"
          width={68}
          height={68}
          className="relative block rounded-full"
          style={{ border: '1.5px solid rgba(200,168,78,0.45)' }}
        />
      </div>

      {/* Hero title — Bebas Neue filling the viewport width */}
      <h1
        className="font-display text-center leading-[0.88] mb-1"
        style={{
          fontSize: 'clamp(50px, 12vw, 90px)',
          color: 'var(--text-header)',
          letterSpacing: '0.03em',
        }}
      >
        The Real
        <br />
        Hyperbolic
        <br />
        Time Chamber
      </h1>

      {/* "Enter the Chamber" — the initiatory moment */}
      <div className="flex items-center gap-3 w-full max-w-[300px] my-7">
        <div
          className="flex-1 h-px"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(200,168,78,0.55))',
          }}
        />
        <span
          className="font-mono text-[9px] tracking-[0.35em] uppercase flex-shrink-0"
          style={{ color: 'var(--text-header)' }}
        >
          Enter the Chamber
        </span>
        <div
          className="flex-1 h-px"
          style={{
            background: 'linear-gradient(to left, transparent, rgba(200,168,78,0.55))',
          }}
        />
      </div>

      {/* Auth card — asymmetric gold left-border */}
      <div
        className="w-full max-w-[300px]"
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid rgba(200,168,78,0.18)',
          borderRight: '1px solid rgba(200,168,78,0.08)',
          borderBottom: '1px solid rgba(200,168,78,0.08)',
          borderLeft: '3px solid var(--text-header)',
          boxShadow: '-8px 0 36px rgba(200,168,78,0.07), 0 24px 64px rgba(0,0,0,0.65)',
          padding: '22px 22px 20px',
        }}
      >
        <p
          className="font-mono text-[9px] tracking-[0.35em] uppercase mb-5"
          style={{ color: 'var(--text-header)' }}
        >
          Authenticate
        </p>

        {/* Google button — dark inset slot */}
        <div
          className="flex justify-center py-3"
          style={{
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <GoogleLogin
            onSuccess={({ credential }) => {
              if (credential) void handleGoogleSuccess(credential);
            }}
            onError={() => {
              setError('Google sign-in failed. Please try again.');
            }}
            theme="filled_black"
            size="large"
            width="240"
          />
        </div>

        {/* Error display */}
        {error && (
          <div
            className="flex items-start gap-2 text-xs mt-3 px-3 py-2"
            style={{
              background: 'var(--bg-error)',
              border: '1px solid var(--border-error)',
              color: 'var(--text-error)',
            }}
          >
            <span className="shrink-0 leading-none mt-px">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span
            className="font-mono text-[9px] tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            or
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Continue without account */}
        <Link
          to="/app?view=programs"
          className="block w-full text-center py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-header)] hover:text-[var(--text-header)]"
        >
          Continue without account
        </Link>
      </div>

      {/* Bottom tagline */}
      <p
        className="font-mono text-[9px] tracking-[0.4em] uppercase mt-8"
        style={{ color: 'var(--text-muted)', opacity: 0.45 }}
      >
        Train smarter · Progress faster
      </p>
    </div>
  );
}
