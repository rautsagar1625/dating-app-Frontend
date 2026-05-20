import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../utils/theme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** Single shimmer bone — animates opacity to fake a shimmer sweep. */
export function SkeletonBone({ width = '100%', height = 16, borderRadius = RADIUS.sm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: COLORS.cardElevated, opacity }, style]}
    />
  );
}

/** Pre-composed skeleton for a notification row. */
export function NotificationRowSkeleton() {
  return (
    <View style={styles.notifRow}>
      <SkeletonBone width={48} height={48} borderRadius={24} />
      <View style={styles.notifContent}>
        <SkeletonBone width="55%" height={13} />
        <SkeletonBone width="80%" height={11} style={{ marginTop: 7 }} />
      </View>
    </View>
  );
}

/** Pre-composed skeleton for a browse user card. */
export function UserCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBone width="100%" height={160} borderRadius={RADIUS.lg} />
      <View style={{ padding: 8, gap: 6 }}>
        <SkeletonBone width="60%" height={12} />
        <SkeletonBone width="40%" height={10} />
      </View>
    </View>
  );
}

/** Pre-composed skeleton for a chat list row. */
export function ChatRowSkeleton() {
  return (
    <View style={styles.chatRow}>
      <SkeletonBone width={50} height={50} borderRadius={25} />
      <View style={styles.chatContent}>
        <SkeletonBone width="45%" height={13} />
        <SkeletonBone width="70%" height={11} style={{ marginTop: 7 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notifContent: { flex: 1, gap: 0 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatContent: { flex: 1, gap: 0 },
});

/** Alias — some screens import SkeletonLoader instead of SkeletonBone. */
export const SkeletonLoader = SkeletonBone;
