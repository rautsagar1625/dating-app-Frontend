import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBlurView } from './AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';
import { GradientButton } from './GradientButton';

interface LockOverlayProps {
  style?: ViewStyle;
  label?: string;
  sublabel?: string;
  buttonLabel?: string;
  onUnlock?: () => void;
  compact?: boolean;
  showButton?: boolean;
}

export function LockOverlay({
  style,
  label = 'Private Content',
  sublabel,
  buttonLabel,
  onUnlock,
  compact = false,
  showButton = false,
}: LockOverlayProps) {
  return (
    <AppBlurView intensity={compact ? 40 : 60} tint="dark" style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.lockIconWrapper, compact && styles.lockIconCompact, SHADOWS.glow]}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockIconGradient}
          >
            <Ionicons name="lock-closed" size={compact ? 18 : 28} color={COLORS.white} />
          </LinearGradient>
        </View>
        {!compact && (
          <>
            <Text style={styles.label}>{label}</Text>
            {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
          </>
        )}
        {showButton && buttonLabel && onUnlock && (
          <GradientButton
            label={buttonLabel}
            onPress={onUnlock}
            size="md"
            style={styles.unlockButton}
          />
        )}
      </View>
    </AppBlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  contentCompact: {
    gap: SPACING.xs,
  },
  lockIconWrapper: {
    borderRadius: RADIUS.full,
  },
  lockIconGradient: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconCompact: {},
  label: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sublabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  unlockButton: {
    marginTop: SPACING.xs,
    minWidth: 180,
  },
});
