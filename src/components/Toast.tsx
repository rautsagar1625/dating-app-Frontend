import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { toast, ToastMessage } from '../services/toast';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const ICON: Record<ToastMessage['type'], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: COLORS.success },
  error:   { name: 'alert-circle',     color: COLORS.error   },
  info:    { name: 'information-circle', color: COLORS.purple },
};

export function Toast() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    toast._setListener((msg) => {
      // Cancel any pending auto-dismiss
      if (timer.current) clearTimeout(timer.current);

      setCurrent(msg);

      // Slide in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 3 s
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -12, duration: 220, useNativeDriver: true }),
        ]).start(() => setCurrent(null));
      }, 3000);
    });

    return () => {
      toast._setListener(null);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!current) return null;

  const icon = ICON[current.type];

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + SPACING.sm, opacity, transform: [{ translateY }], pointerEvents: 'none' },
      ]}
    >
      <Ionicons name={icon.name} size={18} color={icon.color} />
      <Text style={styles.text} numberOfLines={2}>{current.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#1E1E2E',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
