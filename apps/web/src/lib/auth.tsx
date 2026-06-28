import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiUrl } from './config';

export interface AuthUser {
  login: string;
  avatarUrl: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/auth/me'), { credentials: 'include' });
      const data = (await response.json()) as {
        authenticated: boolean;
        login?: string;
        avatarUrl?: string;
      };
      if (data.authenticated && data.login && data.avatarUrl) {
        setUser({ login: data.login, avatarUrl: data.avatarUrl });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = getApiUrl('/auth/github');
  }, []);

  const logout = useCallback(async () => {
    await fetch(getApiUrl('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export async function verifyOwner(businessSlug: string): Promise<boolean> {
  const response = await fetch(
    getApiUrl(`/api/owner/verify?business=${encodeURIComponent(businessSlug)}`),
    { credentials: 'include' },
  );
  const data = (await response.json()) as { isOwner?: boolean };
  return Boolean(data.isOwner);
}
