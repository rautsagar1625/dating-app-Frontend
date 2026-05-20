import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuickExitStore } from '../store/quickExitStore';

export function QuickExitButton() {
  const lock = useQuickExitStore((s) => s.lock);

  return (
    <View style={[styles.wrapper, { pointerEvents: 'box-none' }]}>
      <TouchableOpacity style={styles.btn} onPress={lock} activeOpacity={0.7}>
        <Ionicons name="exit-outline" size={13} color="rgba(255,255,255,0.5)" />
        <Text style={styles.label}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    zIndex: 9999,
    pointerEvents: 'box-none' as any,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
