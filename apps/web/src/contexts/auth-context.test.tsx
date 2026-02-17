import { mock, describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockSubscription = { unsubscribe: mock(() => {}) };

interface AuthResponse {
  readonly data: unknown;
  readonly error: { message: string } | null;
}

const mockAuth = {
  getSession: mock<() => Promise<{ data: { session: unknown }; error: unknown }>>(() =>
    Promise.resolve({ data: { session: null }, error: null })
  ),
  onAuthStateChange: mock(() => ({
    data: { subscription: mockSubscription },
  })),
  signUp: mock<(opts: unknown) => Promise<AuthResponse>>(() =>
    Promise.resolve({ data: {}, error: null })
  ),
  signInWithPassword: mock<(opts: unknown) => Promise<AuthResponse>>(() =>
    Promise.resolve({ data: {}, error: null })
  ),
  signInWithOAuth: mock<(opts: unknown) => Promise<AuthResponse>>(() =>
    Promise.resolve({ data: {}, error: null })
  ),
  signOut: mock(() => Promise.resolve({ error: null })),
};

const mockSupabaseClient = { auth: mockAuth };
const mockGetSupabaseClient = mock<() => unknown>(() => mockSupabaseClient);

mock.module('@/lib/supabase', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

import { AuthProvider, useAuth } from './auth-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  return <AuthProvider>{children}</AuthProvider>;
}

function resetAllMocks(): void {
  mockGetSupabaseClient.mockReset();
  mockGetSupabaseClient.mockImplementation(() => mockSupabaseClient);

  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockImplementation(() =>
    Promise.resolve({ data: { session: null }, error: null })
  );
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: mockSubscription },
  }));
  mockAuth.signUp.mockReset();
  mockAuth.signUp.mockImplementation(() => Promise.resolve({ data: {}, error: null }));
  mockAuth.signInWithPassword.mockReset();
  mockAuth.signInWithPassword.mockImplementation(() => Promise.resolve({ data: {}, error: null }));
  mockAuth.signInWithOAuth.mockReset();
  mockAuth.signInWithOAuth.mockImplementation(() => Promise.resolve({ data: {}, error: null }));
  mockAuth.signOut.mockReset();
  mockAuth.signOut.mockImplementation(() => Promise.resolve({ error: null }));
  mockSubscription.unsubscribe.mockReset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuth', () => {
  it('should throw when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});

describe('AuthProvider', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // -----------------------------------------------------------------------
  // Supabase not configured
  // -----------------------------------------------------------------------
  describe('when Supabase is not configured', () => {
    beforeEach(() => {
      mockGetSupabaseClient.mockImplementation(() => null);
    });

    it('should set configured to false', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.configured).toBe(false);
    });

    it('should not be loading', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(false);
    });

    it('should have no user', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
    });

    it('should return error from signIn', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signIn('a@b.com', 'pw');
      });

      expect(authResult).toEqual({ message: 'Supabase not configured' });
    });

    it('should return error from signUp', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signUp('a@b.com', 'pw');
      });

      expect(authResult).toEqual({ message: 'Supabase not configured' });
    });
  });

  // -----------------------------------------------------------------------
  // Supabase configured
  // -----------------------------------------------------------------------
  describe('when Supabase is configured', () => {
    it('should set configured to true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.configured).toBe(true);
    });

    it('should start in loading state', () => {
      // Make getSession hang forever to freeze loading state
      mockAuth.getSession.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it('should resolve user from existing session', async () => {
      mockAuth.getSession.mockImplementation(() =>
        Promise.resolve({
          data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
          error: null,
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.id).toBe('user-1');
    });

    it('should have null user when no session exists', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // signIn
  // -----------------------------------------------------------------------
  describe('signIn', () => {
    it('should call Supabase signInWithPassword', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return null on success', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = { message: 'placeholder' };
      await act(async () => {
        authResult = await result.current.signIn('test@example.com', 'pw');
      });

      expect(authResult).toBeNull();
    });

    it('should return error message on failure', async () => {
      mockAuth.signInWithPassword.mockImplementation(() =>
        Promise.resolve({ data: {}, error: { message: 'Invalid credentials' } })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(authResult).toEqual({ message: 'Invalid credentials' });
    });
  });

  // -----------------------------------------------------------------------
  // signUp
  // -----------------------------------------------------------------------
  describe('signUp', () => {
    it('should call Supabase signUp', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123');
      });

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('should return error message on failure', async () => {
      mockAuth.signUp.mockImplementation(() =>
        Promise.resolve({ data: {}, error: { message: 'Email already registered' } })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signUp('existing@example.com', 'pw');
      });

      expect(authResult).toEqual({ message: 'Email already registered' });
    });
  });

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------
  describe('signOut', () => {
    it('should call Supabase signOut', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // signInWithGoogle
  // -----------------------------------------------------------------------
  describe('signInWithGoogle', () => {
    it('should return error when APP_URL is not configured', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signInWithGoogle();
      });

      expect(authResult).toEqual({ message: 'OAuth redirect URL is not configured' });
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  describe('cleanup', () => {
    it('should unsubscribe from auth changes on unmount', () => {
      const { unmount } = renderHook(() => useAuth(), { wrapper });

      unmount();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });
});
