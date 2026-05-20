import React from 'react';
import { Platform, Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const Chip = React.memo(function Chip({ label, selected, onPress, style, disabled }: ChipProps) {
  const progress = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.card, 'rgba(123,47,247,0.18)'],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.border, COLORS.purple],
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.textMuted, COLORS.text],
    ),
  }));

  return (
    <Animated.View style={[styles.chip, containerStyle, style]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.93, { damping: 15, stiffness: 350 });
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        onPress={onPress}
        disabled={disabled}
        style={styles.pressable}
      >
        <Animated.Text style={[styles.label, textStyle, selected && styles.labelSelected]}>
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  pressable: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  labelSelected: {
    fontWeight: '700',
  },
});
