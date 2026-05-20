/**
 * Reanimated bottom sheet — replaces the current Modal wrapper for filter/action
 * panels. Snaps to a single height, dismisses on backdrop tap or downward fling.
 */
import React, { useEffect, type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING = { damping: 22, stiffness: 220, mass: 0.9 };
const DISMISS_VELOCITY = 800;
const DISMISS_THRESHOLD = 120;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Height as fraction of screen height (0–1) or absolute px */
  snapHeight?: number;
  children: ReactNode;
}

export function Sheet({ visible, onClose, title, snapHeight = 0.55, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight = snapHeight > 1 ? snapHeight : SCREEN_HEIGHT * snapHeight;
  const translateY = useSharedValue(sheetHeight);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING);
      overlayOpacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withSpring(sheetHeight, SPRING);
      overlayOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(sheetHeight, { duration: 240 });
        overlayOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'box-none' }]}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet panel */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { height: sheetHeight, paddingBottom: insets.bottom + SPACING.md }, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {title && <Text style={styles.title}>{title}</Text>}

          <View style={styles.body}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    textAlign: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
});
