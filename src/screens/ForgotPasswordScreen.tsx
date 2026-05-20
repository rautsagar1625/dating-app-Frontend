import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { analytics } from '../services/analytics';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

type Step = 'email' | 'otp' | 'done';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError]       = useState('');

  const otpRefs = useRef<Array<TextInput | null>>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    intervalRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: trimmed });
      startCooldown(res.data.data.cooldownSeconds ?? 60);
      setStep('otp');
      analytics.track('forgot_password', { method: 'email' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send reset code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste: spread digits across inputs
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otp];
      digits.forEach((d, i) => { if (i + index < 6) next[i + index] = d; });
      setOtp(next);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email: email.trim().toLowerCase(), otp: code });
      setResetToken(res.data.data.resetToken);
      navigation.navigate('ResetPassword', { token: res.data.data.resetToken, email: email.trim() });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid or expired code';
      setError(msg);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.resendResetOtp({ email: email.trim().toLowerCase() });
      startCooldown(res.data.data.cooldownSeconds ?? 60);
    } catch (err: unknown) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name={step === 'otp' ? 'mail' : 'lock-closed'} size={32} color={COLORS.purple} />
              </View>
              <Text style={styles.title}>
                {step === 'email' ? 'Forgot Password?' : 'Check Your Email'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'email'
                  ? 'Enter your email and we\'ll send a verification code to reset your password.'
                  : `We sent a 6-digit code to\n${email}`}
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <LinearGradient
                colors={['rgba(123,47,247,0.1)', 'rgba(26,26,26,0)']}
                style={StyleSheet.absoluteFillObject}
              />

              {step === 'email' && (
                <>
                  <Input
                    label="Email Address"
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    error={error}
                  />
                  <GradientButton label="Send Code" onPress={handleSendEmail} loading={loading} />
                </>
              )}

              {step === 'otp' && (
                <>
                  {/* OTP inputs */}
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={(r) => { otpRefs.current[i] = r; }}
                        style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, i)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                        autoFocus={i === 0}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <GradientButton
                    label="Verify Code"
                    onPress={handleVerifyOtp}
                    loading={loading}
                    disabled={otp.join('').length < 6}
                  />

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResend}
                    disabled={cooldown > 0}
                  >
                    <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.changeEmailBtn} onPress={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}>
                    <Text style={styles.changeEmailText}>Change email address</Text>
                  </TouchableOpacity>
                </>
              )}
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
  container: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconWrap: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(123,47,247,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xxl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  otpInput: {
    width: 48, height: 56, borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardElevated, borderWidth: 1.5,
    borderColor: COLORS.border, color: COLORS.text,
    fontSize: FONTS.sizes.xl, fontWeight: '700',
  },
  otpInputFilled: { borderColor: COLORS.purple },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, textAlign: 'center', marginBottom: SPACING.md, marginTop: -SPACING.sm },
  resendBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  resendText: { color: COLORS.purple, fontSize: FONTS.sizes.md, fontWeight: '600' },
  resendDisabled: { color: COLORS.textMuted },
  changeEmailBtn: { alignItems: 'center', paddingBottom: SPACING.xs },
  changeEmailText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});
