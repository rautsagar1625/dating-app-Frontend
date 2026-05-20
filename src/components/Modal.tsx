import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBlurView } from './AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';
import { GradientButton } from './GradientButton';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryVariant?: 'primary' | 'gold';
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  children,
}) => {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <AppBlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoidView}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.sheet, SHADOWS.glow]}>
              <LinearGradient
                colors={['rgba(123,47,247,0.15)', 'rgba(241,7,163,0.08)', 'rgba(26,26,26,0)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.handle} />
              <View style={styles.iconRow}>
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.titleIcon}
                >
                  <Ionicons name="diamond" size={22} color={COLORS.white} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{title}</Text>
              {description && <Text style={styles.description}>{description}</Text>}
              {children}
              <View style={styles.actions}>
                {primaryLabel && (
                  <GradientButton
                    label={primaryLabel}
                    onPress={onPrimary || onClose}
                    size="md"
                  />
                )}
                {secondaryLabel && (
                  <GradientButton
                    label={secondaryLabel}
                    onPress={onSecondary || onClose}
                    variant="ghost"
                    size="md"
                    style={{ marginTop: SPACING.xs }}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avoidView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actions: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
});
