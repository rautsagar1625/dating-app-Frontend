import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { statusApi } from '../services/api';

const PING_INTERVAL_MS = 60 * 1000; // ping every 60s (server deduplicates DB writes at same interval)

export function usePresence() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ping = () => { statusApi.ping().catch(() => {}); };

  const startInterval = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    ping();
    startInterval();

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        ping();
        startInterval();
      } else {
        stopInterval();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      stopInterval();
      sub.remove();
    };
  }, []);
}
