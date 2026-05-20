import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon:        IoniconsName;
  title:       string;
  description?: string;
  actionLabel?: string;
  onAction?:   () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={COLORS.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={[styles.btn, SHADOWS.glow]} onPress={onAction}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  btn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
