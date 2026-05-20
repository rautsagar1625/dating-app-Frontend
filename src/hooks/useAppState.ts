import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';

const BACKGROUND_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Manages app lifecycle: refetches stale queries on foreground resume,
 * and reconnects the socket after a long background period.
 */
export function useAppState() {
  const qc = useQueryClient();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }

      if (nextState === 'active' && prev.match(/inactive|background/)) {
        const elapsed = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : 0;
        backgroundedAt.current = null;

        if (elapsed > BACKGROUND_STALE_THRESHOLD) {
          // Invalidate all active queries — they'll refetch when their screen is visible
          qc.invalidateQueries({ type: 'active' });

          // Reconnect socket if it dropped while in background
          const socket = getSocket();
          if (socket && !socket.connected) {
            socket.connect();
          }
        }
      }
    });

    return () => sub.remove();
  }, [qc]);
}
