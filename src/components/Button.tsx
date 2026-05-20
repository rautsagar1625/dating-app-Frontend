import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 36;
  const fontSize = size === 'lg' ? FONTS.sizes.lg : size === 'md' ? FONTS.sizes.md : FONTS.sizes.sm;

  if (variant === 'primary' || variant === 'gold') {
    const gradientColors = variant === 'gold' ? COLORS.gradient.gold : COLORS.gradient.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[{ borderRadius: RADIUS.xl, overflow: 'hidden' }, fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={disabled ? ['#444', '#444'] : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientBtn, { height }, SHADOWS.glow]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.primaryText, { fontSize }, textStyle]}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        { height },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.textMuted} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], { fontSize }, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
  },
  gradientBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fullWidth: { width: '100%' },
  secondary: {
    backgroundColor: COLORS.cardElevated,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: { opacity: 0.5 },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  label_secondary: { color: COLORS.text },
  label_outline: { color: COLORS.textSecondary },
  label_ghost: { color: COLORS.textMuted },
});
