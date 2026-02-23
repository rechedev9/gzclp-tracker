import { mock, describe, it, expect, beforeEach } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock setup — mock the API module before importing auth-context
// ---------------------------------------------------------------------------

const mockRefreshAccessToken = mock<() => Promise<string | null>>(() => Promise.resolve(null));
const mockSetAccessToken = mock<(token: string | null) => void>(() => {});

const mockSignupPost = mock<(body: unknown) => Promise<{ data: unknown; error: unknown }>>(() =>
  Promise.resolve({ data: null, error: null })
);
const mockSigninPost = mock<(body: unknown) => Promise<{ data: unknown; error: unknown }>>(() =>
  Promise.resolve({ data: null, error: null })
);
const mockSignoutPost = mock<() => Promise<{ data: unknown; error: unknown }>>(() =>
  Promise.resolve({ data: null, error: null })
);

const mockMeGet = mock<() => Promise<{ data: unknown; error: unknown }>>(() =>
  Promise.resolve({ data: null, error: { status: 401 } })
);

mock.module('@/lib/api', () => ({
  refreshAccessToken: mockRefreshAccessToken,
  setAccessToken: mockSetAccessToken,
  api: {
    auth: {
      signup: { post: mockSignupPost },
      signin: { post: mockSigninPost },
      signout: { post: mockSignoutPost },
      me: { get: mockMeGet },
    },
  },
}));

function mockMeSuccess(id: string, email: string): void {
  mockMeGet.mockImplementation(() => Promise.resolve({ data: { id, email }, error: null }));
}

function mockMeFailure(): void {
  mockMeGet.mockImplementation(() => Promise.resolve({ data: null, error: { status: 401 } }));
}

import { AuthProvider, useAuth } from './auth-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  return <AuthProvider>{children}</AuthProvider>;
}

function resetAllMocks(): void {
  mockRefreshAccessToken.mockReset();
  mockRefreshAccessToken.mockImplementation(() => Promise.resolve(null));
  mockSetAccessToken.mockReset();
  mockSignupPost.mockReset();
  mockSignupPost.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  mockSigninPost.mockReset();
  mockSigninPost.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  mockSignoutPost.mockReset();
  mockSignoutPost.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  mockMeGet.mockReset();
  mockMeFailure();
}

// Helper: create a valid JWT with given payload (base64url encoded)
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
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

  describe('initial state', () => {
    it('should always set configured to true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.configured).toBe(true);
    });

    it('should start in loading state', () => {
      // Make refresh hang to freeze loading
      mockRefreshAccessToken.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it('should have null user when refresh fails', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should restore user from refresh token', async () => {
      const token = fakeJwt({ sub: 'user-123', email: 'test@example.com' });
      mockRefreshAccessToken.mockImplementation(() => Promise.resolve(token));
      mockMeSuccess('user-123', 'test@example.com');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.id).toBe('user-123');
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('signIn', () => {
    it('should return null on success and set user', async () => {
      mockSigninPost.mockImplementation(() =>
        Promise.resolve({
          data: {
            accessToken: fakeJwt({ sub: 'user-1', email: 'a@b.com' }),
            user: { id: 'user-1', email: 'a@b.com', name: null },
          },
          error: null,
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = { message: 'placeholder' };
      await act(async () => {
        authResult = await result.current.signIn('a@b.com', 'password123');
      });

      expect(authResult).toBeNull();
      expect(result.current.user?.id).toBe('user-1');
      expect(mockSetAccessToken).toHaveBeenCalled();
    });

    it('should return error message on failure', async () => {
      mockSigninPost.mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' },
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signIn('a@b.com', 'wrong');
      });

      expect(authResult).toEqual({ message: 'Invalid email or password' });
    });
  });

  describe('signUp', () => {
    it('should return null on success and set user', async () => {
      mockSignupPost.mockImplementation(() =>
        Promise.resolve({
          data: {
            accessToken: fakeJwt({ sub: 'user-2', email: 'new@b.com' }),
            user: { id: 'user-2', email: 'new@b.com', name: null },
          },
          error: null,
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = { message: 'placeholder' };
      await act(async () => {
        authResult = await result.current.signUp('new@b.com', 'password123');
      });

      expect(authResult).toBeNull();
      expect(result.current.user?.id).toBe('user-2');
    });

    it('should return error on duplicate email', async () => {
      mockSignupPost.mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { error: 'Email already registered', code: 'AUTH_EMAIL_EXISTS' },
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let authResult: unknown = null;
      await act(async () => {
        authResult = await result.current.signUp('existing@b.com', 'pw12345678');
      });

      expect(authResult).toEqual({ message: 'Email already registered' });
    });
  });

  describe('signOut', () => {
    it('should call signout API and clear user', async () => {
      // Start with a logged-in user
      const token = fakeJwt({ sub: 'user-1', email: 'a@b.com' });
      mockRefreshAccessToken.mockImplementation(() => Promise.resolve(token));
      mockMeSuccess('user-1', 'a@b.com');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignoutPost).toHaveBeenCalled();
      expect(mockSetAccessToken).toHaveBeenCalledWith(null);
      expect(result.current.user).toBeNull();
    });
  });
});
