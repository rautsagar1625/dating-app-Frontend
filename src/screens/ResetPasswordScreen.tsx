import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { analytics } from '../services/analytics';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route:      RouteProp<AuthStackParamList, 'ResetPassword'>;
};

type Strength = 'weak' | 'fair' | 'strong';

function getStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  return 'strong';
}

const STRENGTH_CONFIG: Record<Strength, { label: string; color: string; bars: number }> = {
  weak:   { label: 'Weak',   color: COLORS.error,   bars: 1 },
  fair:   { label: 'Fair',   color: COLORS.gold,    bars: 2 },
  strong: { label: 'Strong', color: COLORS.success, bars: 3 },
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [errors, setErrors]       = useState<{ password?: string; confirm?: string }>({});

  const strength = password.length > 0 ? getStrength(password) : null;

  const validate = () => {
    const e: typeof errors = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (strength === 'weak') e.password = 'Password is too weak';
    if (!confirm) e.confirm = 'Please confirm your password';
    else if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
      analytics.track('password_reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Reset failed. The link may have expired.';
      setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.centered}>
          <View style={[styles.successIcon, SHADOWS.glow]}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.successGradient}
            >
              <Ionicons name="checkmark" size={48} color={COLORS.white} />
            </LinearGradient>
          </View>
          <Text style={styles.doneTitle}>Password Reset!</Text>
          <Text style={styles.doneSubtitle}>Your password has been updated successfully. You can now sign in with your new password.</Text>
          <TouchableOpacity style={[styles.doneBtn, SHADOWS.glow]} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={COLORS.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneBtnGradient}>
              <Text style={styles.doneBtnText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name="key" size={32} color={COLORS.purple} />
              </View>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>Choose a strong password to secure your account.</Text>
            </View>

            <View style={styles.card}>
              <LinearGradient colors={['rgba(123,47,247,0.1)', 'rgba(26,26,26,0)']} style={StyleSheet.absoluteFillObject} />

              <Input
                label="New Password"
                placeholder="At least 8 characters"
                isPassword
                autoFocus
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors({}); }}
                error={errors.password}
              />

              {/* Strength meter */}
              {strength && (
                <View style={styles.strengthRow}>
                  {([1, 2, 3] as const).map((bar) => {
                    const cfg = STRENGTH_CONFIG[strength];
                    return (
                      <View
                        key={bar}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: bar <= cfg.bars ? cfg.color : COLORS.border },
                        ]}
                      />
                    );
                  })}
                  <Text style={[styles.strengthLabel, { color: STRENGTH_CONFIG[strength].color }]}>
                    {STRENGTH_CONFIG[strength].label}
                  </Text>
                </View>
              )}

              <Input
                label="Confirm Password"
                placeholder="Repeat your password"
                isPassword
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
                error={errors.confirm}
              />

              <GradientButton label="Reset Password" onPress={handleReset} loading={loading} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  container: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconWrap: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(123,47,247,0.15)', alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xxl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: -SPACING.sm, marginBottom: SPACING.md },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', minWidth: 48 },
  successIcon: { width: 120, height: 120, borderRadius: RADIUS.full, marginBottom: SPACING.xl, overflow: 'hidden' },
  successGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: COLORS.text, fontSize: FONTS.sizes.xxxl, fontWeight: '800', marginBottom: SPACING.sm },
  doneSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  doneBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  doneBtnGradient: { paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md },
  doneBtnText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800' },
});
