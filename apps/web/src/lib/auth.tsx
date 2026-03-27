'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authApi, refreshAuthSession, clearAuthStorage } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'MEMBER';
  phoneNumber?: string;
  profileImageUrl?: string | null;
  memberNumber?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
  isMember: boolean;
  // Shorthand untuk redirect home
  homePath: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_COOKIE_EXP_DAYS = 8 / 24;
const REFRESH_COOKIE_EXP_DAYS = 30;

const getCookieOptions = () => ({
  sameSite: 'strict' as const,
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
});

const HOME_MAP: Record<string, string> = {
  OWNER:     '/owner/dashboard',
  MANAGER:   '/manager/dashboard',
  CASHIER:   '/cashier/dashboard',
  MEMBER:    '/owner/dashboard',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const stored = Cookies.get('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (mounted) setUser(parsed);
        } catch {
          Cookies.remove('user');
        }
      }

      const accessToken  = Cookies.get('accessToken');
      const refreshToken = Cookies.get('refreshToken');

      if (!accessToken && !refreshToken) {
        if (mounted) setLoading(false);
        return;
      }

      if (!accessToken && refreshToken) {
        try {
          await refreshAuthSession();
        } catch {
          // Interceptor akan handle
        }
      }

      if (Cookies.get('accessToken') && !stored) {
        try {
          const me = await authApi.me();
          if (mounted) {
            setUser(me);
            Cookies.set('user', JSON.stringify(me), {
              expires: REFRESH_COOKIE_EXP_DAYS,
              ...getCookieOptions(),
            });
          }
        } catch {
          // Biarkan interceptor handle
        }
      }

      if (mounted) setLoading(false);
    };

    bootstrapAuth();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    Cookies.set('accessToken', data.accessToken, {
      expires: ACCESS_COOKIE_EXP_DAYS, ...getCookieOptions(),
    });
    Cookies.set('refreshToken', data.refreshToken, {
      expires: REFRESH_COOKIE_EXP_DAYS, ...getCookieOptions(),
    });
    Cookies.set('user', JSON.stringify(data.user), {
      expires: REFRESH_COOKIE_EXP_DAYS, ...getCookieOptions(),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const rt = Cookies.get('refreshToken');
    try { if (rt) await authApi.logout(rt); } catch {}
    clearAuthStorage();
    setUser(null);
  }, []);

  const setAndPersistUser = useCallback((nextUser: User) => {
    Cookies.set('user', JSON.stringify(nextUser), {
      expires: REFRESH_COOKIE_EXP_DAYS, ...getCookieOptions(),
    });
    setUser(nextUser);
  }, []);

  // Proactive token refresh setiap 30 menit
  useEffect(() => {
    if (!user) return;
    let inFlight = false;

    const tryRefresh = async () => {
      if (inFlight) return;
      const hasAccess  = !!Cookies.get('accessToken');
      const hasRefresh = !!Cookies.get('refreshToken');
      if (!hasAccess && hasRefresh) {
        inFlight = true;
        try { await refreshAuthSession(); }
        catch {}
        finally { inFlight = false; }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tryRefresh();
    };

    const interval = setInterval(tryRefresh, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser: setAndPersistUser,
        isOwner:     user?.role === 'OWNER',
        isManager:   user?.role === 'MANAGER',
        isCashier:   user?.role === 'CASHIER',
        isMember:    user?.role === 'MEMBER',
        homePath:    HOME_MAP[user?.role ?? ''] || '/login',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
