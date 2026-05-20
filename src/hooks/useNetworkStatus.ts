import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { analytics } from '../services/analytics';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? true;
      setIsConnected(connected);
      setIsInternetReachable(reachable);
      analytics.setOnline(connected && reachable);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    return unsubscribe;
  }, []);

  return { isConnected, isInternetReachable, isOffline: !isConnected || !isInternetReachable };
}
