import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokensDto, PublicUserDto } from '@viaja/shared';

const SESSION_KEY = 'viaja.auth.session.v1';

export interface StoredSession {
  user: PublicUserDto;
  tokens: AuthTokensDto;
}

const memoryFallback = new Map<string, string>();

async function setRawItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(key, value);
      return;
    } catch {
      memoryFallback.set(key, value);
      return;
    }
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

async function getRawItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

async function deleteRawItem(key: string): Promise<void> {
  memoryFallback.delete(key);
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Ignore storage access errors
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore secure store errors in test environments
  }
}

export const secureSessionStorage = {
  async saveSession(session: StoredSession): Promise<void> {
    await setRawItem(SESSION_KEY, JSON.stringify(session));
  },

  async loadSession(): Promise<StoredSession | null> {
    const raw = await getRawItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      await deleteRawItem(SESSION_KEY);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await deleteRawItem(SESSION_KEY);
  },
};
