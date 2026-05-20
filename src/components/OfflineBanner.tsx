import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COLORS, FONTS, SPACING } from '../utils/theme';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets        = useSafeAreaInsets();

  // P1-7: initialise to the *correct* position based on current network state so
  // users who mount the screen while already offline see the banner immediately,
  // rather than waiting for a state transition to trigger the animation.
  const translateY = useRef(new Animated.Value(isOffline ? 0 : -60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue:         isOffline ? 0 : -60,
      useNativeDriver: true,
      damping:         15,
      stiffness:       120,
    }).start();
  }, [isOffline, translateY]);

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline" size={16} color={COLORS.white} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:          'absolute',
    left:              0,
    right:             0,
    zIndex:            9999,
    backgroundColor:   '#333',
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               SPACING.xs,
    paddingVertical:   SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  text: {
    color:      COLORS.white,
    fontSize:   FONTS.sizes.sm,
    fontWeight: '600',
  },
});
