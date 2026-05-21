import React, { type ReactNode, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS } from '../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;
const SUPERLIKE_THRESHOLD = -110;
const ROTATION_FACTOR = 14;
const SPRING_CONFIG = { damping: 18, stiffness: 180, mass: 0.8 };
const EJECT_CONFIG = { damping: 20, stiffness: 150 };

interface SwipeCardProps {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeSuperLike?: () => void;
  enabled?: boolean;
}

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeSuperLike: () => void;
}

export const SwipeCard = React.memo(
  React.forwardRef<SwipeCardRef, SwipeCardProps>(function SwipeCard(
    { children, onSwipeLeft, onSwipeRight, onSwipeSuperLike, enabled = true },
    ref,
  ) {
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    const animStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        tx.value,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
        Extrapolation.CLAMP,
      );
      return {
        transform: [
          { translateX: tx.value },
          { translateY: ty.value },
          { rotate: `${rotate}deg` },
        ],
      };
    });

    const likeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(tx.value, [20, SWIPE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
    }));

    const nopeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(tx.value, [-20, -SWIPE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
    }));

    const superStyle = useAnimatedStyle(() => ({
      opacity: interpolate(ty.value, [-30, SUPERLIKE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
    }));

    const ejectRight = () => {
      tx.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 320 });
      ty.value = withTiming(60, { duration: 320 });
    };
    const ejectLeft = () => {
      tx.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 320 });
      ty.value = withTiming(60, { duration: 320 });
    };
    const ejectUp = () => {
      ty.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
    };

    useImperativeHandle(ref, () => ({
      swipeRight: () => { ejectRight(); setTimeout(() => runOnJS(onSwipeRight)(), 150); },
      swipeLeft:  () => { ejectLeft();  setTimeout(() => runOnJS(onSwipeLeft)(),  150); },
      swipeSuperLike: () => {
        ejectUp();
        setTimeout(() => onSwipeSuperLike && runOnJS(onSwipeSuperLike)(), 150);
      },
    }));

    const pan = Gesture.Pan()
      .enabled(enabled)
      .onUpdate((e) => {
        tx.value = e.translationX;
        ty.value = e.translationY * 0.35;
      })
      .onEnd((e) => {
        if (e.translationX > SWIPE_THRESHOLD) {
          ejectRight();
          runOnJS(onSwipeRight)();
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          ejectLeft();
          runOnJS(onSwipeLeft)();
        } else if (onSwipeSuperLike && e.translationY < SUPERLIKE_THRESHOLD) {
          ejectUp();
          runOnJS(onSwipeSuperLike)();
        } else {
          tx.value = withSpring(0, SPRING_CONFIG);
          ty.value = withSpring(0, SPRING_CONFIG);
        }
      });

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
          {children}

          <Animated.View style={[styles.stamp, styles.stampLike, likeStyle, { pointerEvents: 'none' }]}>
            <Text style={styles.likeText}>LIKE</Text>
          </Animated.View>

          <Animated.View style={[styles.stamp, styles.stampNope, nopeStyle, { pointerEvents: 'none' }]}>
            <Text style={styles.nopeText}>NOPE</Text>
          </Animated.View>

          <Animated.View style={[styles.stamp, styles.stampSuper, superStyle, { pointerEvents: 'none' }]}>
            <Text style={styles.superText}>SUPER</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }),
);

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    top: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 2.5,
  },
  stampLike: {
    left: 22,
    borderColor: COLORS.success,
    backgroundColor: 'rgba(48,209,88,0.15)',
    transform: [{ rotate: '-16deg' }],
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  stampNope: {
    right: 22,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255,69,58,0.15)',
    transform: [{ rotate: '16deg' }],
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  stampSuper: {
    left: '50%',
    marginLeft: -50,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  likeText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    letterSpacing: 3,
  },
  nopeText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    letterSpacing: 3,
  },
  superText: {
    color: COLORS.gold,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
