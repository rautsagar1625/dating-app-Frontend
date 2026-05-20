import React, { useState } from 'react';
import {
  Platform, View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBlurView } from './AppBlurView';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { analytics } from '../services/analytics';

const CATEGORIES = [
  { id: 'bug',        label: 'Bug Report',   icon: 'bug-outline'         },
  { id: 'ux',         label: 'UX Feedback',  icon: 'finger-print-outline'},
  { id: 'feature',    label: 'Feature Idea', icon: 'bulb-outline'        },
  { id: 'crash',      label: 'Crash',        icon: 'warning-outline'     },
  { id: 'other',      label: 'Other',        icon: 'chatbubble-outline'  },
] as const;

type Category = typeof CATEGORIES[number]['id'];

interface BetaFeedbackProps {
  /** Shows the floating button in the corner. Mount this once in AppStack. */
  enabled?: boolean;
}

export function BetaFeedback({ enabled = true }: BetaFeedbackProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('bug');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const btnScale = useSharedValue(1);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(btnScale.value, { damping: 12, stiffness: 250 }) }],
  }));

  if (!enabled) return null;

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Please describe the issue', 'A short description helps us fix it faster.');
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      analytics.track('beta_feedback_submitted', { category, length: text.length });
      // In production wire this to your support API / Slack webhook
      await new Promise((r) => setTimeout(r, 600)); // stub
      Alert.alert('Thanks! 🙌', 'Your feedback has been sent to the team.');
      setText('');
      setCategory('bug');
      setOpen(false);
    } catch {
      Alert.alert('Error', 'Could not send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.fab, { bottom: insets.bottom + 96 }, btnStyle]}
        >
          <TouchableOpacity
            onPressIn={() => { btnScale.value = 0.88; if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}
            onPressOut={() => { btnScale.value = 1; }}
            onPress={() => { setOpen(true); analytics.track('beta_feedback_opened'); }}
            activeOpacity={1}
          >
            <LinearGradient
              colors={COLORS.gradient.gold}
              style={styles.fabGradient}
            >
              <Ionicons name="bug-outline" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Feedback sheet */}
      {open && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(180)}
          style={[StyleSheet.absoluteFillObject, { pointerEvents: 'box-none' }]}
        >
          <AppBlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Beta Feedback</Text>
                <Text style={styles.sheetSubtitle}>Help us make Velvet better</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Category selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
                  onPress={() => { setCategory(cat.id); if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={category === cat.id ? COLORS.white : COLORS.textMuted}
                  />
                  <Text style={[styles.categoryLabel, category === cat.id && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text area */}
            <TextInput
              style={styles.textArea}
              value={text}
              onChangeText={setText}
              placeholder="Describe what happened or what could be better..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{text.length}/1000</Text>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (submitting || !text.trim()) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !text.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitBtnGrad}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 99,
    ...SHADOWS.glowGold,
  },
  fabGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  sheetSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryRow: { gap: SPACING.sm, marginBottom: SPACING.md, paddingBottom: 2 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(123,47,247,0.2)',
    borderColor: COLORS.purple,
  },
  categoryLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  categoryLabelActive: { color: COLORS.white },
  textArea: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    height: 120,
    marginBottom: SPACING.xs,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnGrad: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '800' },
});
