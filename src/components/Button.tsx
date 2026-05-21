import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS, ANIMATION } from '../utils/theme';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?:      'sm' | 'md' | 'lg';
  loading?:   boolean;
  disabled?:  boolean;
  style?:     ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const height   = size === 'lg' ? 56 : size === 'md' ? 48 : 36;
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

  if (variant === 'primary' || variant === 'gold') {
    const gradientColors = variant === 'gold' ? COLORS.gradient.gold : COLORS.gradient.primary;
    const glowShadow     = variant === 'gold' ? SHADOWS.glowGold : SHADOWS.glow;
    return (
      <Animated.View
        style={[
          { transform: [{ scale }], borderRadius: RADIUS.xl, overflow: 'hidden' },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled || loading}
        >
          <LinearGradient
            colors={disabled ? ['#3A3A3A', '#3A3A3A'] : gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradientBtn, { height }, disabled ? {} : glowShadow]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={[styles.primaryText, { fontSize }, textStyle]}>{label}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <Pressable
        style={[
          styles.base,
          styles[variant],
          { height },
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textMuted} size="small" />
        ) : (
          <Text style={[styles.label, styles[`label_${variant}`], { fontSize }, textStyle]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius:    RADIUS.xl,
    alignItems:      'center',
    justifyContent:  'center',
    flexDirection:   'row',
    paddingHorizontal: SPACING.lg,
  },
  gradientBtn: {
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   RADIUS.xl,
    paddingHorizontal: SPACING.lg,
  },
  primaryText: {
    color:         COLORS.white,
    fontWeight:    '700',
    letterSpacing: 0.4,
  },
  fullWidth: { width: '100%' },
  secondary: { backgroundColor: COLORS.cardElevated },
  outline: {
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    borderColor:     COLORS.border,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  label: {
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
  label_secondary: { color: COLORS.text },
  label_outline:   { color: COLORS.textSecondary },
  label_ghost:     { color: COLORS.textMuted },
});
