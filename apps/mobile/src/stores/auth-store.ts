import { create } from 'zustand';
import type { LoginInput, PublicUserDto, RegisterInput } from '@viaja/shared';
import { authApi } from '../features/auth/auth-api';
import { registerUnauthorizedHandler } from '../services/api';
import { setMobileMonitoringUser } from '../services/monitoring';
import { secureSessionStorage } from '../services/secure-session';

interface AuthState {
  user: PublicUserDto | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,

  async hydrate() {
    registerUnauthorizedHandler(() => {
      set({ user: null });
      setMobileMonitoringUser(null);
    });

    const session = await secureSessionStorage.loadSession();
    if (!session) {
      set({ user: null, isHydrated: true });
      setMobileMonitoringUser(null);
      return;
    }

    set({ user: session.user, isHydrated: true });
    setMobileMonitoringUser(session.user);
  },

  async signIn(input) {
    const authResponse = await authApi.login(input);
    await secureSessionStorage.saveSession(authResponse);
    set({ user: authResponse.user });
    setMobileMonitoringUser(authResponse.user);
  },

  async signUp(input) {
    const authResponse = await authApi.register(input);
    await secureSessionStorage.saveSession(authResponse);
    set({ user: authResponse.user });
    setMobileMonitoringUser(authResponse.user);
  },

  async signOut() {
    const session = await secureSessionStorage.loadSession();
    try {
      if (session?.tokens.accessToken) {
        await authApi.logout(session.tokens.refreshToken);
      }
    } catch {
      // Proceed with local session wipe even if network is offline
    } finally {
      await secureSessionStorage.clearSession();
      set({ user: null });
      setMobileMonitoringUser(null);
    }
  },
}));
