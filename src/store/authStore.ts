import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { disconnectSocket } from '../services/socket';

// ── Cross-platform storage adapter for zustand/persist ────────────────────
const storage = Platform.OS === 'web'
  ? {
      getItem: async (name: string): Promise<string | null> => {
        try { return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null; } catch { return null; }
      },
      setItem: async (name: string, value: string): Promise<void> => {
        try { if (typeof window !== 'undefined') window.localStorage.setItem(name, value); } catch {}
      },
      removeItem: async (name: string): Promise<void> => {
        try { if (typeof window !== 'undefined') window.localStorage.removeItem(name); } catch {}
      },
    }
  : {
      getItem: async (name: string): Promise<string | null> => {
        try { return await SecureStore.getItemAsync(name); } catch { return null; }
      },
      setItem: async (name: string, value: string): Promise<void> => {
        try {
          await SecureStore.setItemAsync(name, value, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
        } catch {}
      },
      removeItem: async (name: string): Promise<void> => {
        try { await SecureStore.deleteItemAsync(name); } catch {}
      },
    };

// ── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  phone?: string | null;
  role?: string;
  name: string | null;
  username?: string | null;
  age?: number | null;
  gender?: string | null;
  location?: string | null;
  bio?: string | null;
  profilePhoto?: string;
  isPrivatePhoto?: boolean;
  isProfileComplete: boolean;
}

interface AuthState {
  user:        User | null;
  token:       string | null;
  _hydrated:   boolean;
  login:       (user: User, token: string) => void;
  logout:      () => void;
  updateProfile: (data: Partial<User>) => void;
  setHydrated: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:      null,
      token:     null,
      _hydrated: false,

      login: (user, token) => set({ user, token }),

      logout: () => {
        disconnectSocket();
        set({ user: null, token: null });
      },

      updateProfile: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name:    'velvet-auth',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
