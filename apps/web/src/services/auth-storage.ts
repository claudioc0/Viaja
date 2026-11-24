import type { AuthTokensDto, PublicUserDto } from '@viaja/shared';

const STORAGE_KEY = 'viaja.web.session.v1';

export interface WebStoredSession {
  user: PublicUserDto;
  tokens: AuthTokensDto;
}

export const webAuthStorage = {
  load(): WebStoredSession | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WebStoredSession;
    } catch {
      return null;
    }
  },

  save(session: WebStoredSession): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
