import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { retentionApi, Nudge } from '../services/api';
import { useAuthStore } from '../store/authStore';

export function useNudge() {
  const token = useAuthStore((s) => s.token);
  const [nudges, setNudges] = useState<Nudge[]>([]);

  const fetch = useCallback(async () => {
    if (!token) return;
    try {
      const res = await retentionApi.getNudge();
      setNudges(res.data.data.nudges.filter((n) => n.count > 0));
    } catch { /* non-critical */ }
  }, [token]);

  useEffect(() => {
    fetch();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetch();
    });
    return () => sub.remove();
  }, [fetch]);

  return nudges;
}
