import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const noop = () => Promise.resolve();

export const useHaptics = () =>
  Platform.OS === 'web'
    ? { light: noop, medium: noop, heavy: noop, success: noop, error: noop, warning: noop }
    : {
        light:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
        medium:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
        heavy:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
        success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
        error:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
        warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
      };
