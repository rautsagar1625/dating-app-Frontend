import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  colors?: [string, string];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function GradientButton({
  label,
  onPress,
  colors = COLORS.gradient.primary,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'lg',
  icon,
}: GradientButtonProps) {
  const height = size === 'lg' ? 56 : size === 'md' ? 46 : 38;
  const fontSize = size === 'lg' ? FONTS.sizes.lg : size === 'md' ? FONTS.sizes.md : FONTS.sizes.sm;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.outlineWrapper, { height }, style]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.outlineBorder}
        >
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[styles.outlineInner, { height: height - 2 }]}
          >
            {icon && icon}
            <Text style={[styles.outlineText, { fontSize }, textStyle]}>{label}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[styles.ghostButton, { height }, style]}
      >
        {icon && icon}
        <Text style={[styles.ghostText, { fontSize }, textStyle]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.wrapper, style]}
    >
      <LinearGradient
        colors={disabled ? ['#444', '#444'] : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { height }, SHADOWS.glow]}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            {icon && icon}
            <Text style={[styles.text, { fontSize }, textStyle]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
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
    letterSpacing: 0.5,
  },
  icon: {},
  outlineWrapper: {
    borderRadius: RADIUS.xl,
  },
  outlineBorder: {
    padding: 1.5,
    borderRadius: RADIUS.xl,
    flex: 1,
  },
  outlineInner: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl - 1.5,
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
