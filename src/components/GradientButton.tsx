import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS, ANIMATION } from '../utils/theme';

interface GradientButtonProps {
  label:     string;
  onPress:   () => void;
  colors?:   [string, string];
  style?:    ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?:  boolean;
  variant?:  'primary' | 'outline' | 'ghost';
  size?:     'sm' | 'md' | 'lg';
  icon?:     React.ReactNode;
}

export function GradientButton({
  label,
  onPress,
  colors = COLORS.gradient.primary,
  style,
  textStyle,
  disabled = false,
  loading  = false,
  variant  = 'primary',
  size     = 'lg',
  icon,
}: GradientButtonProps) {
  const scale    = useRef(new Animated.Value(1)).current;
  const height   = size === 'lg' ? 56 : size === 'md' ? 46 : 38;
  const fontSize = size === 'lg' ? FONTS.sizes.lg : size === 'md' ? FONTS.sizes.md : FONTS.sizes.sm;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue:         0.96,
      useNativeDriver: true,
      ...ANIMATION.spring.press,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue:         1,
      useNativeDriver: true,
      ...ANIMATION.spring.default,
    }).start();

  if (variant === 'outline') {
    return (
      <Animated.View style={[{ transform: [{ scale }], borderRadius: RADIUS.xl }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled || loading}
        >
          <LinearGradient
            colors={disabled ? ['#444', '#444'] : colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.outlineBorder, { borderRadius: RADIUS.xl }]}
          >
            <LinearGradient
              colors={['rgba(26,26,26,0.95)', 'rgba(26,26,26,0.95)']}
              style={[styles.outlineInner, { height: height - 2, borderRadius: RADIUS.xl - 1.5 }]}
            >
              {icon}
              <Text style={[styles.outlineText, { fontSize }, textStyle]}>{label}</Text>
            </LinearGradient>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'ghost') {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled || loading}
          style={[styles.ghostButton, { height }]}
        >
          {icon}
          <Text style={[styles.ghostText, { fontSize }, textStyle]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={disabled ? ['#3A3A3A', '#3A3A3A'] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { height }, disabled ? {} : SHADOWS.glowStrong]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, { fontSize }, textStyle]}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  text: {
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  outlineBorder: {
    padding: 1.5,
  },
  outlineInner: {
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  outlineText: {
    color: COLORS.white,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  ghostText: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
