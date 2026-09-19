import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { logger } from '../utils/logger';
import type { UserInfo } from '@shared/api.interface';
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  setToken,
  clearToken,
  getMe,
  getToken,
  AUTH_401_EVENT,
} from '@client/src/api';

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  login: (user: UserInfo, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(() => Boolean(getStoredUser()));

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getToken();
    if (!storedUser || !storedToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const verify = async (): Promise<void> => {
      try {
        const res = await getMe();
        if (!cancelled) {
          setUser(res.user);
          setStoredUser(res.user);
        }
      } catch (e) {
        logger.error('登录态验证失败', e);
        if (!cancelled) {
          clearToken();
          clearStoredUser();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = useCallback((userData: UserInfo, token: string): void => {
    setToken(token);
    setStoredUser(userData);
    setUser(userData);
  }, []);

  const handleLogout = useCallback((): void => {
    clearToken();
    clearStoredUser();
    setUser(null);
  }, []);

  useEffect(() => {
    const onAuth401 = (): void => {
      handleLogout();
    };
    window.addEventListener(AUTH_401_EVENT, onAuth401);
    return () => {
      window.removeEventListener(AUTH_401_EVENT, onAuth401);
    };
  }, [handleLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login: handleLogin, logout: handleLogout }),
    [user, loading, handleLogin, handleLogout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
