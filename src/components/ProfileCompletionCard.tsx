import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import type { CompletionStep } from '../services/api';

interface Props {
  score:   number;
  steps:   CompletionStep[];
  onPress: () => void;
}

export function ProfileCompletionCard({ score, steps, onPress }: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(progressAnim, { toValue: score / 100, useNativeDriver: false, damping: 18, stiffness: 120 }),
      Animated.timing(fadeAnim,     { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [score]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const pendingSteps = steps.filter((s) => !s.done);
  const doneCount    = steps.length - pendingSteps.length;

  if (score === 100) return null; // Hide when complete

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(123,47,247,0.12)', 'rgba(241,7,163,0.08)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.sub}>{doneCount}/{steps.length} steps done</Text>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.trackWrap}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: barWidth }]}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
        </View>

        {/* Pending steps (max 3) */}
        <View style={styles.stepsWrap}>
          {pendingSteps.slice(0, 3).map((step) => (
            <View key={step.label} style={styles.stepRow}>
              <Ionicons name="ellipse-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          ))}
          {pendingSteps.length > 3 && (
            <Text style={styles.moreLabel}>+{pendingSteps.length - 3} more</Text>
          )}
        </View>

        <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.8}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Complete now</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom:     SPACING.md,
    borderRadius:     RADIUS.xl,
    overflow:         'hidden',
    borderWidth:      1,
    borderColor:      'rgba(123,47,247,0.3)',
    ...SHADOWS.glow,
  },
  gradient: { padding: SPACING.md },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.sm,
  },
  title: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700' },
  sub:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  scoreCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(123,47,247,0.2)',
    borderWidth: 2, borderColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { color: COLORS.purple, fontSize: FONTS.sizes.sm, fontWeight: '800' },
  trackWrap: { marginBottom: SPACING.sm },
  track: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill:  { height: '100%', borderRadius: 3 },
  stepsWrap: { gap: 4, marginBottom: SPACING.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  moreLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginLeft: 18 },
  cta: { borderRadius: RADIUS.full, overflow: 'hidden', alignSelf: 'flex-start' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  ctaText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
