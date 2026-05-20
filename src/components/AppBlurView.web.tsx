// Web: simulate blur with a semi-transparent overlay.
// CSS backdrop-filter would be ideal but requires a DOM element — this overlay is
// sufficient for the dark UI where blur is purely decorative.
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface AppBlurViewProps {
  intensity?: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AppBlurView({ intensity = 50, tint = 'dark', style, children }: AppBlurViewProps) {
  const alpha = Math.min((intensity / 100) * 0.92, 0.92);
  const bg = tint === 'light'
    ? `rgba(255,255,255,${alpha})`
    : `rgba(10,10,10,${alpha})`;

  return (
    <View style={[style, { backgroundColor: bg }]}>
      {children}
    </View>
  );
}

export type AppBlurViewProps_ = AppBlurViewProps;
