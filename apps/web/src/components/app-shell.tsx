'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadInstanceMap, loadDataCompat } from '@/lib/storage-v2';
import { Dashboard } from './dashboard';
import { GZCLPApp } from './gzclp-app';
import { ProfilePage } from './profile-page';
import type { ProgramInstanceMap } from '@gzclp/shared/types/program';

type View = 'dashboard' | 'tracker' | 'profile';

const VALID_VIEWS: ReadonlySet<string> = new Set(['dashboard', 'tracker', 'profile']);

interface ShellState {
  readonly view: View;
  readonly instanceMap: ProgramInstanceMap | null;
}

const emptySubscribe = (): (() => void) => () => {};
const returnTrue = (): boolean => true;
const returnFalse = (): boolean => false;

function isView(value: string): value is View {
  return VALID_VIEWS.has(value);
}

function parseViewParam(param: string | null): View {
  if (param && isView(param)) return param;
  // Legacy: ?view=programs maps to dashboard
  if (param === 'programs') return 'dashboard';
  return 'dashboard';
}

function loadInstanceMapWithCompat(): ProgramInstanceMap | null {
  let map = loadInstanceMap();

  // If no new-format data, try legacy migration
  if (!map) {
    loadDataCompat(); // triggers migration as side effect
    map = loadInstanceMap(); // re-read after migration
  }

  return map;
}

export function AppShell(): React.ReactNode {
  // useSyncExternalStore returns false on server, true on client — no hydration mismatch
  const isClient = useSyncExternalStore(emptySubscribe, returnTrue, returnFalse);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<ShellState>(() => ({
    view: parseViewParam(searchParams.get('view')),
    instanceMap: isClient ? loadInstanceMapWithCompat() : null,
  }));

  const setView = useCallback(
    (view: View): void => {
      setState((prev) => ({ ...prev, view }));
      router.replace(view === 'dashboard' ? '/app' : `/app?view=${view}`, { scroll: false });
    },
    [router]
  );

  const handleSelectProgram = useCallback((): void => {
    // Only GZCLP is supported — programId will route to different trackers in the future
    setView('tracker');
  }, [setView]);

  const handleContinueProgram = useCallback((): void => {
    setView('tracker');
  }, [setView]);

  const handleBackToDashboard = useCallback((): void => {
    // Re-read storage for fresh progress data
    const map = loadInstanceMap();
    setState({ view: 'dashboard', instanceMap: map });
    router.replace('/app', { scroll: false });
  }, [router]);

  const handleGoToProfile = useCallback((): void => {
    setView('profile');
  }, [setView]);

  let content: React.ReactNode;

  if (state.view === 'profile') {
    content = <ProfilePage onBack={handleBackToDashboard} />;
  } else if (state.view === 'dashboard') {
    content = (
      <Dashboard
        instanceMap={state.instanceMap}
        onSelectProgram={handleSelectProgram}
        onContinueProgram={handleContinueProgram}
        onGoToProfile={handleGoToProfile}
      />
    );
  } else {
    content = (
      <GZCLPApp onBackToDashboard={handleBackToDashboard} onGoToProfile={handleGoToProfile} />
    );
  }

  return (
    <div key={state.view} className="animate-[viewFadeIn_0.2s_ease-out]">
      {content}
    </div>
  );
}
