'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { loadInstanceMap, loadDataCompat } from '@/lib/storage-v2';
import { Dashboard } from './dashboard';
import { GZCLPApp } from './gzclp-app';
import { ProfilePage } from './profile-page';
import type { ProgramInstanceMap } from '@/types/program';

type View = 'dashboard' | 'tracker' | 'profile';

interface ShellState {
  readonly view: View;
  readonly instanceMap: ProgramInstanceMap | null;
}

const emptySubscribe = (): (() => void) => () => {};
const returnTrue = (): boolean => true;
const returnFalse = (): boolean => false;

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

  const [state, setState] = useState<ShellState>(() => ({
    view: 'dashboard',
    instanceMap: isClient ? loadInstanceMapWithCompat() : null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- programId will route to different trackers in the future
  const handleSelectProgram = useCallback((programId: string): void => {
    // For now, only GZCLP is supported — GZCLPApp + useProgram handle setup.
    setState((prev) => ({ ...prev, view: 'tracker' }));
  }, []);

  const handleContinueProgram = useCallback((): void => {
    setState((prev) => ({ ...prev, view: 'tracker' }));
  }, []);

  const handleBackToDashboard = useCallback((): void => {
    // Re-read storage for fresh progress data
    const map = loadInstanceMap();
    setState({ view: 'dashboard', instanceMap: map });
  }, []);

  const handleGoToProfile = useCallback((): void => {
    setState((prev) => ({ ...prev, view: 'profile' }));
  }, []);

  if (state.view === 'profile') {
    return <ProfilePage onBack={handleBackToDashboard} />;
  }

  if (state.view === 'dashboard') {
    return (
      <Dashboard
        instanceMap={state.instanceMap}
        onSelectProgram={handleSelectProgram}
        onContinueProgram={handleContinueProgram}
        onGoToProfile={handleGoToProfile}
      />
    );
  }

  return <GZCLPApp onBackToDashboard={handleBackToDashboard} onGoToProfile={handleGoToProfile} />;
}
