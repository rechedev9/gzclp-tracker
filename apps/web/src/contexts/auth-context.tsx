import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api, setAccessToken, refreshAccessToken } from '@/lib/api';
import { isRecord } from '@gzclp/shared/type-guards';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
}

interface AuthResult {
  readonly message: string;
}

interface AuthState {
  readonly user: UserInfo | null;
  readonly loading: boolean;
  readonly configured: boolean;
}

interface AuthActions {
  readonly signUp: (email: string, password: string) => Promise<AuthResult | null>;
  readonly signIn: (email: string, password: string) => Promise<AuthResult | null>;
  readonly signOut: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseUserInfo(data: unknown): UserInfo | null {
  if (!isRecord(data)) return null;
  if (typeof data.id !== 'string' || typeof data.email !== 'string') return null;
  return {
    id: data.id,
    email: data.email,
    ...(typeof data.name === 'string' ? { name: data.name } : {}),
  };
}

function extractError(result: unknown): string {
  if (isRecord(result) && typeof result.message === 'string') return result.message;
  if (isRecord(result) && typeof result.error === 'string') return result.error;
  return 'Something went wrong';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactNode {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Attempt to restore session from refresh cookie on mount
  useEffect(() => {
    const restore = async (): Promise<void> => {
      const token = await refreshAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch user info from /auth/me — authoritative, no fragile JWT decoding
      const { data, error } = await api.auth.me.get();
      if (!error) {
        const userInfo = parseUserInfo(data);
        if (userInfo) setUser(userInfo);
      }

      setLoading(false);
    };

    void restore();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult | null> => {
      const { data, error } = await api.auth.signup.post({
        email,
        password,
      });

      if (error) {
        return { message: extractError(error) };
      }

      if (isRecord(data) && typeof data.accessToken === 'string') {
        setAccessToken(data.accessToken);
        const userInfo = parseUserInfo(isRecord(data) ? data.user : null);
        if (userInfo) setUser(userInfo);
      }

      return null;
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult | null> => {
      const { data, error } = await api.auth.signin.post({
        email,
        password,
      });

      if (error) {
        return { message: extractError(error) };
      }

      if (isRecord(data) && typeof data.accessToken === 'string') {
        setAccessToken(data.accessToken);
        const userInfo = parseUserInfo(isRecord(data) ? data.user : null);
        if (userInfo) setUser(userInfo);
      }

      return null;
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    await api.auth.signout.post();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: true,
      signUp,
      signIn,
      signOut,
    }),
    [user, loading, signUp, signIn, signOut]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
