import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { pushTokenApi } from '../services/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const usePushNotifications = () => {
  const token    = useAuthStore((s) => s.token);
  const registered = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !token || registered.current) return;

    const register = async () => {
      try {
        // Permissions
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return; // user declined — respect it

        // Android channel (required for Android 8+)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7B2FF7',
          });
        }

        const projectId =
          (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
          (Constants.easConfig?.projectId as string | undefined);

        if (!projectId) {
          // In local dev without an EAS project ID the token will still work via
          // the Expo Go tunnel. In production builds this should never be empty.
          console.warn('[PushNotifications] EAS projectId not found — token may be invalid in production');
        }

        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );

        await pushTokenApi.register(expoPushToken);
        registered.current = true;
      } catch {
        // Push registration is non-critical — never crash the app
      }
    };

    register();
  }, [token]);

  // Deregister on logout (token becomes null)
  useEffect(() => {
    if (token) return;
    registered.current = false;
  }, [token]);
};
