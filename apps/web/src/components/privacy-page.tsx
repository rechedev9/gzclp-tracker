import { Link } from 'react-router-dom';

export function PrivacyPage(): React.ReactNode {
  return (
    <div className="min-h-dvh bg-[var(--bg-body)]">
      <header className="bg-[var(--bg-header)] border-b border-[var(--border-color)] px-6 sm:px-10 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-bold text-[var(--text-header)] hover:opacity-80 transition-opacity"
          >
            &larr; Back
          </Link>
          <span className="text-sm font-bold text-[var(--text-header)]">
            The Real Hyperbolic Time Chamber
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">Data We Store</h2>
            <p>
              All training data (exercises, weights, sets, reps, and results) is stored locally in
              your browser&apos;s localStorage. This data never leaves your device unless you
              explicitly enable cloud sync.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">
              Cloud Sync (Optional)
            </h2>
            <p>
              If you create an account, we store your email address and encrypted training data on
              Supabase servers. This enables cross-device sync. Cloud sync is entirely optional
              &mdash; the app works fully offline without an account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">
              Google Sign-In (Optional)
            </h2>
            <p>
              If you sign in with Google, we receive your email address and profile name from
              Google. We do not access your contacts, calendar, or any other Google data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">
              Analytics &amp; Tracking
            </h2>
            <p>
              We do not use any analytics, tracking cookies, or third-party scripts. No data is
              shared with advertisers or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">Deleting Your Data</h2>
            <p>
              <strong>Local data:</strong> Clear your browser&apos;s localStorage or use the
              &quot;Reset All&quot; option in the app.
            </p>
            <p className="mt-2">
              <strong>Cloud data:</strong> If you have an account and want your cloud data deleted,
              contact us and we will remove your account and all associated data from Supabase.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-main)] mb-2">Contact</h2>
            <p>
              For privacy questions or data deletion requests, open an issue on the project
              repository or reach out to the maintainer.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
