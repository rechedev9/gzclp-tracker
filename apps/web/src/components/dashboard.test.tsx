/**
 * Dashboard unit tests — verifies skeleton rendering during catalog load
 * and program card rendering after catalog loads.
 */
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------

const mockRefreshAccessToken = mock<() => Promise<string | null>>(() =>
  Promise.resolve('fake-access-token')
);

mock.module('@/lib/api', () => ({
  refreshAccessToken: mockRefreshAccessToken,
  setAccessToken: mock<(token: string | null) => void>(() => {}),
  getAccessToken: mock<() => string | null>(() => 'fake-access-token'),
}));

// ---------------------------------------------------------------------------
// Mock API functions
// ---------------------------------------------------------------------------

const CATALOG_ENTRIES = [
  {
    id: 'gzclp',
    name: 'GZCLP',
    description: 'Linear progression program.',
    author: 'Cody Lefever',
    category: 'strength',
    source: 'preset',
    totalWorkouts: 90,
    workoutsPerWeek: 3,
    cycleLength: 4,
  },
  {
    id: 'ppl531',
    name: 'PPL 5/3/1',
    description: 'Push Pull Legs.',
    author: 'HeXaN',
    category: 'hypertrophy',
    source: 'preset',
    totalWorkouts: 156,
    workoutsPerWeek: 6,
    cycleLength: 6,
  },
  {
    id: 'nivel7',
    name: 'Nivel 7',
    description: 'Strength program.',
    author: 'nivel7',
    category: 'strength',
    source: 'preset',
    totalWorkouts: 48,
    workoutsPerWeek: 4,
    cycleLength: 48,
  },
];

const mockFetchCatalogList = mock(() => new Promise<unknown>(() => {}));

const mockFetchPrograms = mock<() => Promise<unknown[]>>(() => Promise.resolve([]));

mock.module('@/lib/api-functions', () => ({
  apiFetch: mock((path: string) => {
    if (path === '/auth/me') return Promise.resolve({ id: 'user-1', email: 'test@test.com' });
    return Promise.reject(new Error(`Unexpected path: ${path}`));
  }),
  fetchCatalogList: mockFetchCatalogList,
  fetchCatalogDetail: mock(() => Promise.resolve(null)),
  fetchPrograms: mockFetchPrograms,
  fetchGenericProgramDetail: mock(() => Promise.resolve(null)),
}));

import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { Dashboard } from './dashboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper(): React.FC<{ readonly children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { readonly children: React.ReactNode }): React.ReactNode {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AuthProvider, null, React.createElement(ToastProvider, null, children))
    );
  };
}

const noopFn = (): void => {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockFetchCatalogList.mockClear();
  mockFetchPrograms.mockClear();
  mockRefreshAccessToken.mockClear();

  mockRefreshAccessToken.mockImplementation(() => Promise.resolve('fake-access-token'));
  mockFetchPrograms.mockImplementation(() => Promise.resolve([]));
});

describe('Dashboard', () => {
  describe('catalog loading skeleton', () => {
    it('should render skeleton elements while catalog query is loading', async () => {
      // Mock fetchCatalogList to never resolve (simulating loading state)
      mockFetchCatalogList.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves — stays in loading state
          })
      );

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <Dashboard
            onSelectProgram={noopFn}
            onStartNewProgram={noopFn}
            onContinueProgram={noopFn}
          />
        </Wrapper>
      );

      // The dashboard renders an "Elegir un Programa" heading while loading
      await waitFor(() => {
        expect(screen.getByText('Elegir un Programa')).toBeDefined();
      });

      // Skeleton pulse elements should be present
      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('catalog loaded', () => {
    it('should render program cards after catalog data loads', async () => {
      mockFetchCatalogList.mockImplementation(() => Promise.resolve(CATALOG_ENTRIES));

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <Dashboard
            onSelectProgram={noopFn}
            onStartNewProgram={noopFn}
            onContinueProgram={noopFn}
          />
        </Wrapper>
      );

      // Wait for program names to appear
      await waitFor(() => {
        expect(screen.getByText('GZCLP')).toBeDefined();
      });

      expect(screen.getByText('PPL 5/3/1')).toBeDefined();
      expect(screen.getByText('Nivel 7')).toBeDefined();
    });

    it('should render 3 "Iniciar Programa" buttons', async () => {
      mockFetchCatalogList.mockImplementation(() => Promise.resolve(CATALOG_ENTRIES));

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <Dashboard
            onSelectProgram={noopFn}
            onStartNewProgram={noopFn}
            onContinueProgram={noopFn}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('GZCLP')).toBeDefined();
      });

      const buttons = screen.getAllByText('Iniciar Programa');
      expect(buttons).toHaveLength(3);
    });
  });
});
