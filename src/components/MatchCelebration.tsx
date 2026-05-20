import React, { useEffect, useRef } from 'react';
import {
  Platform, View, Text, StyleSheet, Dimensions, Modal, TouchableOpacity, Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppBlurView } from './AppBlurView';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');
const PLACEHOLDER = 'https://randomuser.me/api/portraits/lego/1.jpg';

interface MatchData {
  matchedUserId: string;
  matchedUserName: string;
  matchedUserAvatar?: string;
  myAvatar?: string;
}

interface MatchCelebrationProps {
  visible: boolean;
  matchData: MatchData | null;
  onMessage: () => void;
  onKeepSwiping: () => void;
}

const HEARTS = ['❤️', '💜', '🩷', '✨', '💫'];

function FloatingHeart({ x, delay }: { x: number; delay: number }) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(delay, withTiming(-H * 0.4, { duration: 2000 }));
    opacity.value = withDelay(delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1400, withTiming(0, { duration: 300 })),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.heart, { left: x }, style]}>
      {HEARTS[Math.floor(Math.random() * HEARTS.length)]}
    </Animated.Text>
  );
}

export function MatchCelebration({ visible, matchData, onMessage, onKeepSwiping }: MatchCelebrationProps) {
  const myScale = useSharedValue(0);
  const theirScale = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (visible && matchData) {
      if (!hasTriggeredHaptic.current) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        hasTriggeredHaptic.current = true;
      }
      myScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 180 }));
      theirScale.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 180 }));
      titleScale.value = withDelay(500, withSpring(1, { damping: 10, stiffness: 200 }));
    } else {
      myScale.value = 0;
      theirScale.value = 0;
      titleScale.value = 0;
      hasTriggeredHaptic.current = false;
    }
  }, [visible, matchData]);

  const myAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: myScale.value }],
  }));
  const theirAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: theirScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleScale.value,
  }));

  if (!matchData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <AppBlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />

      <LinearGradient
        colors={['rgba(123,47,247,0.4)', 'rgba(241,7,163,0.3)', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating hearts */}
      {visible && Array.from({ length: 8 }).map((_, i) => (
        <FloatingHeart key={i} x={(W / 8) * i + 10} delay={i * 180} />
      ))}

      <View style={styles.content}>
        {/* Title */}
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.titleTop}>IT'S A</Text>
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleGradientWrap}
          >
            <Text style={styles.titleMain}>MATCH!</Text>
          </LinearGradient>
          <Text style={styles.subtitle}>
            You and {matchData.matchedUserName} liked each other
          </Text>
        </Animated.View>

        {/* Avatars */}
        <View style={styles.avatarsRow}>
          <Animated.View style={[styles.avatarWrap, styles.avatarLeft, myAvatarStyle]}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              style={styles.avatarRing}
            >
              <Image
                source={{ uri: matchData.myAvatar ?? PLACEHOLDER }}
                style={styles.avatar}
              />
            </LinearGradient>
          </Animated.View>

          <View style={styles.heartBadge}>
            <LinearGradient colors={COLORS.gradient.primary} style={styles.heartBadgeGrad}>
              <Ionicons name="heart" size={22} color={COLORS.white} />
            </LinearGradient>
          </View>

          <Animated.View style={[styles.avatarWrap, styles.avatarRight, theirAvatarStyle]}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              style={styles.avatarRing}
            >
              <Image
                source={{ uri: matchData.matchedUserAvatar ?? PLACEHOLDER }}
                style={styles.avatar}
              />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* CTA buttons */}
        <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.btns}>
          <TouchableOpacity style={styles.msgBtn} onPress={onMessage} activeOpacity={0.85}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.msgBtnGrad}
            >
              <Ionicons name="chatbubble" size={18} color={COLORS.white} />
              <Text style={styles.msgBtnText}>Send a Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepBtn} onPress={onKeepSwiping} activeOpacity={0.75}>
            <Text style={styles.keepBtnText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const AVATAR_SIZE = 120;
const RING_SIZE = AVATAR_SIZE + 8;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  titleTop: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    letterSpacing: 6,
    marginBottom: 4,
  },
  titleGradientWrap: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 2,
    marginBottom: SPACING.md,
  },
  titleMain: {
    color: COLORS.white,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl * 1.5,
  },
  avatarWrap: { position: 'relative' },
  avatarLeft: { marginRight: -20, zIndex: 1 },
  avatarRight: { marginLeft: -20, zIndex: 0 },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  heartBadge: {
    zIndex: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.glowPink,
  },
  heartBadgeGrad: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btns: {
    width: '100%',
    gap: SPACING.md,
    alignItems: 'center',
  },
  msgBtn: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  msgBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
  },
  msgBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  keepBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  keepBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  heart: {
    position: 'absolute',
    bottom: H * 0.15,
    fontSize: 28,
  },
});
