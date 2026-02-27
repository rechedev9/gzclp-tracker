import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Dashboard } from './dashboard';
import { ProgramApp } from './program-app';
import { ProfilePage } from './profile-page';
import { AppSkeleton } from './app-skeleton';

type View = 'dashboard' | 'tracker' | 'profile';

const ALL_VIEWS: readonly View[] = ['dashboard', 'tracker', 'profile'];
const VALID_VIEWS: ReadonlySet<string> = new Set(ALL_VIEWS);

const VIEW_ORDER: Record<View, number> = { dashboard: 0, tracker: 1, profile: 2 };

function isView(value: string): value is View {
  return VALID_VIEWS.has(value);
}

function parseViewParam(param: string | null): View {
  if (param && isView(param)) return param;
  return 'dashboard';
}

export function AppShell(): React.ReactNode {
  const { loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [view, setViewState] = useState<View>(() => parseViewParam(searchParams.get('view')));
  const prevViewRef = useRef<View>(view);
  const [mountedViews, setMountedViews] = useState<Set<View>>(() => new Set([view]));
  const [animatingView, setAnimatingView] = useState<View | null>(null);
  const animationDirectionRef = useRef<'Right' | 'Left'>('Right');

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>(undefined);
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [pendingProgramId, setPendingProgramId] = useState<string | undefined>(undefined);

  const setView = useCallback(
    (next: View): void => {
      animationDirectionRef.current = VIEW_ORDER[next] >= VIEW_ORDER[view] ? 'Right' : 'Left';
      prevViewRef.current = view;
      setViewState(next);
      setMountedViews((prev) => {
        if (prev.has(next)) return prev;
        const updated = new Set(prev);
        updated.add(next);
        return updated;
      });
      setAnimatingView(next);
      window.scrollTo(0, 0);
      navigate(next === 'dashboard' ? '/app' : `/app?view=${next}`, { replace: true });
    },
    [view, navigate]
  );

  const clearSelection = (): void => {
    setSelectedInstanceId(undefined);
    setSelectedProgramId(undefined);
    setPendingProgramId(undefined);
  };

  const handleStartNewProgram = (programId: string): void => {
    setSelectedInstanceId(undefined);
    setSelectedProgramId(programId);
    setPendingProgramId(programId);
    setView('tracker');
  };

  const handleContinueProgram = (instanceId: string, programId: string): void => {
    setSelectedInstanceId(instanceId);
    setSelectedProgramId(programId);
    setPendingProgramId(undefined);
    setView('tracker');
  };

  const handleBackToDashboard = (): void => {
    clearSelection();
    setView('dashboard');
  };

  const handleGoToProfile = (): void => {
    setView('profile');
  };

  // URL guard: redirect to dashboard if tracker view is reached with no program selected
  useEffect(() => {
    if (view === 'tracker' && !pendingProgramId && !selectedProgramId) {
      setView('dashboard');
    }
  }, [view, pendingProgramId, selectedProgramId, setView]);

  const handleAnimationEnd = (): void => {
    setAnimatingView(null);
  };

  if (authLoading) return <AppSkeleton />;

  const renderView = (v: View): React.ReactNode => {
    switch (v) {
      case 'dashboard':
        return (
          <Dashboard
            onStartNewProgram={handleStartNewProgram}
            onContinueProgram={handleContinueProgram}
            onGoToProfile={handleGoToProfile}
          />
        );
      case 'tracker': {
        const programId = pendingProgramId ?? selectedProgramId;
        return programId ? (
          <ProgramApp
            programId={programId}
            instanceId={selectedInstanceId}
            isActive={view === 'tracker'}
            onBackToDashboard={handleBackToDashboard}
            onGoToProfile={handleGoToProfile}
          />
        ) : null;
      }
      case 'profile':
        return (
          <ProfilePage
            programId={selectedProgramId}
            instanceId={selectedInstanceId}
            onBack={handleBackToDashboard}
          />
        );
    }
  };

  return (
    <>
      {ALL_VIEWS.map((v) => {
        if (!mountedViews.has(v)) return null;
        const isActive = v === view;
        const isAnimating = v === animatingView;
        const animationClass = isAnimating
          ? `animate-[slideInFrom${animationDirectionRef.current}_0.2s_ease-out]`
          : '';

        return (
          <div
            key={v}
            style={{ display: isActive ? 'block' : 'none' }}
            className={animationClass}
            onAnimationEnd={isAnimating ? handleAnimationEnd : undefined}
          >
            {renderView(v)}
          </div>
        );
      })}
    </>
  );
}
