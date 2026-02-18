import { Link } from 'react-router-dom';
import { FEATURES, STEPS, METRICS, PERSONAS } from '@/lib/landing-page-data';
import { useFadeInOnScroll } from '@/hooks/use-fade-in-on-scroll';
import { useScrollSpy } from '@/hooks/use-scroll-spy';

const SECTION_IDS = ['features', 'how-it-works', 'programs'] as const;

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Programs', href: '#programs' },
] as const;

/* ── Gradient Divider ──────────────────────────── */

function GradientDivider(): React.ReactNode {
  return <div className="landing-gradient-divider" />;
}

/* ── Main Component ────────────────────────────── */

export function LandingPage(): React.ReactNode {
  const observe = useFadeInOnScroll();
  const activeSection = useScrollSpy(SECTION_IDS);

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[var(--btn-hover-bg)] focus:text-[var(--btn-hover-text)] focus:text-sm focus:font-bold"
      >
        Skip to content
      </a>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 bg-[var(--bg-header)]/90 backdrop-blur-md border-b border-[var(--border-color)]"
      >
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="RSN logo" width={36} height={36} className="rounded-full" />
          <span className="text-sm font-bold tracking-tight text-[var(--text-header)]">
            The Real Hyperbolic Time Chamber
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-200 ${
                activeSection === link.href.slice(1)
                  ? 'text-[var(--text-header)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-header)]'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
        <Link
          to="/login"
          className="text-xs font-bold text-[var(--btn-text)] border border-[var(--btn-border)] px-4 py-2 hover:bg-[var(--btn-hover-bg)] hover:text-[var(--btn-hover-text)] hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(200,168,78,0.3)] transition-all duration-200"
        >
          Sign In
        </Link>
      </nav>

      <main id="main-content">
        {/* ── Hero ────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          className="relative text-center px-6 pt-20 pb-16 sm:pt-28 sm:pb-20"
        >
          <div className="landing-fade-in landing-visible max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">
              100% Free &middot; Sync Across Devices
            </p>
            <h1
              id="hero-heading"
              aria-label="Train Smarter. Progress Faster."
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-header)] leading-[1.1] mb-6"
            >
              Train Smarter.
              <br />
              <span className="text-[var(--text-main)]">Progress Faster.</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-lg mx-auto mb-10 leading-relaxed">
              Stop guessing in the gym. Follow proven programs that auto-adjust weight, sets, and
              reps — so every session moves you forward.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="px-8 py-3.5 text-sm font-bold border-2 border-[var(--btn-border)] bg-[var(--btn-hover-bg)] text-[var(--btn-hover-text)] hover:opacity-90 transition-all min-w-[200px]"
              >
                Start Training
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-3.5 text-sm font-bold border-2 border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-light)] hover:text-[var(--text-main)] transition-all min-w-[200px]"
              >
                How It Works
              </a>
            </div>
          </div>

          {/* Decorative gradient glow */}
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none opacity-[0.07]"
            style={{
              background:
                'radial-gradient(ellipse at center, var(--fill-progress) 0%, transparent 70%)',
            }}
          />
        </section>

        <GradientDivider />

        {/* ── Metrics Banner ─────────────────────────────── */}
        <section
          aria-label="Program metrics"
          ref={observe}
          className="landing-fade-in px-6 sm:px-10 py-12 sm:py-16 bg-[var(--bg-header)]"
        >
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
            {METRICS.map((m) => (
              <div key={m.label}>
                <div className="text-3xl sm:text-4xl font-extrabold text-[var(--text-header)]">
                  {m.value}
                  {m.suffix && (
                    <span className="text-lg sm:text-xl font-bold text-[var(--text-muted)] ml-1">
                      {m.suffix}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-medium">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <GradientDivider />

        {/* ── Features ────────────────────────────────────── */}
        <section
          id="features"
          aria-labelledby="features-heading"
          ref={observe}
          className="landing-fade-in px-6 sm:px-10 py-12 sm:py-20 max-w-5xl mx-auto"
        >
          <h2
            id="features-heading"
            className="text-center text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] mb-4"
          >
            Everything You Need
          </h2>
          <p className="text-center text-sm sm:text-base text-[var(--text-muted)] mb-14 max-w-md mx-auto">
            No fluff. Just focused tools that make every rep count.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="relative bg-[var(--bg-card)] border border-[var(--border-color)] p-6 transition-all landing-card-glow group"
              >
                <div className="text-[var(--text-header)] mb-4 group-hover:scale-110 transition-transform origin-left">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <GradientDivider />

        {/* ── How It Works ────────────────────────────────── */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          ref={observe}
          className="landing-fade-in px-6 sm:px-10 py-12 sm:py-20 bg-[var(--bg-header)]"
        >
          <div className="max-w-3xl mx-auto">
            <h2
              id="how-it-works-heading"
              className="text-center text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] mb-4"
            >
              Three Steps. That&apos;s It.
            </h2>
            <p className="text-center text-sm sm:text-base text-[var(--text-muted)] mb-14 max-w-lg mx-auto">
              No complicated setup. No spreadsheets. Just pick your weights and go.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
              {STEPS.map((s) => (
                <div key={s.num} className="text-center sm:text-left">
                  <span className="text-4xl font-extrabold text-[var(--fill-progress)] opacity-25 block mb-3">
                    {s.num}
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-main)] mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">{s.desc}</p>

                  {/* Anime quote — prominent */}
                  <blockquote className="landing-quote-glow p-3 rounded-sm">
                    <p className="text-sm italic text-[var(--text-main)] leading-relaxed">
                      {s.quote}
                    </p>
                    <cite className="text-xs text-[var(--text-muted)] not-italic block mt-1.5">
                      {s.source}
                    </cite>
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </section>

        <GradientDivider />

        {/* ── Why Smart Training ──────────────────────────── */}
        <section
          aria-labelledby="smart-training-heading"
          ref={observe}
          className="landing-fade-in px-6 sm:px-10 py-12 sm:py-20 max-w-4xl mx-auto"
        >
          <h2
            id="smart-training-heading"
            className="text-center text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] mb-4"
          >
            Why Smart Training Wins
          </h2>
          <p className="text-center text-sm sm:text-base text-[var(--text-muted)] mb-12 max-w-lg mx-auto leading-relaxed">
            Most people stall because they train randomly. Structured programs with built-in
            progression rules are how you actually get stronger — consistently.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] p-6 text-center landing-card-glow">
              <div className="text-[var(--text-header)] mb-3">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto"
                >
                  <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mb-2">
                Progressive Overload
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Weight goes up when you&apos;re ready. Not before, not after. The program decides.
              </p>
            </div>
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] p-6 text-center landing-card-glow">
              <div className="text-[var(--text-header)] mb-3">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto"
                >
                  <path
                    d="M12 20V10M18 20V4M6 20v-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mb-2">
                Failure Management
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Missed a lift? The program adapts — adjusting volume and intensity to keep you
                progressing.
              </p>
            </div>
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] p-6 text-center landing-card-glow">
              <div className="text-[var(--text-header)] mb-3">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mb-2">Zero Thinking</div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Walk into the gym knowing exactly what to do. No planning, no spreadsheets, no
                wasted time.
              </p>
            </div>
          </div>
        </section>

        <GradientDivider />

        {/* ── Who It's For ───────────────────────────────── */}
        <section
          id="programs"
          aria-labelledby="personas-heading"
          ref={observe}
          className="landing-fade-in px-6 sm:px-10 py-12 sm:py-20 bg-[var(--bg-header)]"
        >
          <div className="max-w-4xl mx-auto">
            <h2
              id="personas-heading"
              className="text-center text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] mb-4"
            >
              Built for Every Lifter
            </h2>
            <p className="text-center text-sm sm:text-base text-[var(--text-muted)] mb-12 max-w-lg mx-auto">
              Whether you&apos;re touching a barbell for the first time or breaking through a
              plateau.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {PERSONAS.map((p) => (
                <div
                  key={p.title}
                  className="relative bg-[var(--bg-card)] border border-[var(--border-color)] p-6 text-center landing-card-glow"
                >
                  <div className="text-[var(--text-header)] mb-3 flex justify-center">{p.icon}</div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">{p.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <GradientDivider />
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="px-6 sm:px-10 py-10 bg-[var(--bg-header)] text-center">
        <p className="text-sm font-bold text-[var(--text-header)] mb-2">
          The Real Hyperbolic Time Chamber
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Built for lifters who refuse to stall.
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)] opacity-60">
          <Link to="/privacy" className="hover:text-[var(--text-main)] transition-colors">
            Privacy Policy
          </Link>
          <span aria-hidden="true">&middot;</span>
          <span>Built by RSN</span>
        </div>
      </footer>
    </div>
  );
}
