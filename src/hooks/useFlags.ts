import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useFlagStore, FlagKey } from '../store/flagStore';
import { connectSocket } from '../services/socket';
import api from '../services/api';

// Fetch all flags for the current user from the server.
// Called once at login and on every `flags_updated` socket event.
async function fetchFlags(): Promise<void> {
  const { token } = useAuthStore.getState();
  if (!token) return;

  try {
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const res = await api.get('/flags/evaluate', {
      headers: { 'x-platform': platform },
    });
    useFlagStore.getState().setFlags(res.data.data ?? {});
  } catch {
    // Safe fallback: keep existing (possibly stale) flags rather than wiping to empty
  }
}

// ── useFlags ─────────────────────────────────────────────────────────────────
// Mount this once in your root navigator (alongside useSocket).
// Handles initial load, socket-driven refresh, and auth-state resets.

export const useFlags = () => {
  const token = useAuthStore((s) => s.token);
  const reset = useFlagStore((s) => s.reset);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }

    fetchFlags();

    const socket = connectSocket(token);

    const handleFlagsUpdated = () => {
      fetchFlags();
    };

    socket.on('flags_updated', handleFlagsUpdated);
    return () => {
      socket.off('flags_updated', handleFlagsUpdated);
    };
  }, [token, reset]);
};

// ── useFlag ───────────────────────────────────────────────────────────────────
// Use this in any component to read a single flag.
// Returns `fallback` (default false) until flags are loaded or if the key
// doesn't exist — guarantees no flickering after initial load.

export const useFlag = (key: FlagKey, fallback = false): boolean => {
  return useFlagStore((s) => s.getFlag(key, fallback));
};

// ── Imperative accessor ───────────────────────────────────────────────────────
// Use outside of React components (e.g., inside API service functions or
// navigation guards) where hooks can't be called.

export const getFlag = (key: FlagKey, fallback = false): boolean => {
  return useFlagStore.getState().getFlag(key, fallback);
};
