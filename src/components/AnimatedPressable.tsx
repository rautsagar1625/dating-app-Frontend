import React, { type ReactNode } from 'react';
import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
  disabled?: boolean;
}

export const AnimatedPressable = React.memo(function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  pressedScale = 0.94,
  haptic = true,
  disabled = false,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 350, mass: 0.5 }) }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPressIn={() => {
          scale.value = pressedScale;
          if (haptic && !disabled && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }}
        onPressOut={() => { scale.value = 1; }}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});
