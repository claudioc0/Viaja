'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthResponseDto, LoginInput, PublicUserDto, RegisterInput } from '@viaja/shared';
import { setWebUnauthorizedListener, webApiRequest } from '../services/api-client';
import { webAuthStorage } from '../services/auth-storage';

interface AuthContextValue {
  user: PublicUserDto | null;
  isHydrated: boolean;
  signIn: (input: LoginInput) => Promise<PublicUserDto>;
  signUp: (input: RegisterInput) => Promise<PublicUserDto>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setWebUnauthorizedListener(() => {
      setUser(null);
    });

    const stored = webAuthStorage.load();
    setUser(stored?.user ?? null);
    setIsHydrated(true);
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const res = await webApiRequest<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    webAuthStorage.save(res);
    setUser(res.user);
    return res.user;
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const res = await webApiRequest<AuthResponseDto>('/auth/register', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    webAuthStorage.save(res);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    const stored = webAuthStorage.load();
    try {
      if (stored?.tokens.accessToken) {
        await webApiRequest<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken: stored.tokens.refreshToken },
          retryOnUnauthorized: false,
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      webAuthStorage.clear();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isHydrated, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
