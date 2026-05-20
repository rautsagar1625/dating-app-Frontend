import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { authApi, walletApi } from '../services/api';
import { collectFingerprint } from '../utils/fingerprint';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

const GENDERS: { label: string; iconName: 'female' | 'male' | 'people' }[] = [
  { label: 'Woman', iconName: 'female' },
  { label: 'Man', iconName: 'male' },
  { label: 'Other', iconName: 'people' },
];

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const login = useAuthStore((s) => s.login);
  const { syncBalance } = useWalletStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password || password.length < 6) e.password = 'Min 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const deviceFingerprint = await collectFingerprint().catch(() => undefined);
      const res = await authApi.register({ email, password, deviceFingerprint });
      const { user, token } = res.data.data;
      // Store name locally until profile setup saves it to backend
      login({ ...user, name }, token);
      // Sync the 50-credit signup bonus
      walletApi.getBalance().then((r) => syncBalance(r.data.data.balance)).catch(() => {});
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('already')) {
        setErrors({ email: 'An account with this email already exists' });
      } else {
        Alert.alert('Registration Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.backGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="arrow-back" size={14} color={COLORS.white} />
                <Text style={styles.backText}>Back</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Velvet — your privacy is our priority</Text>
          </View>

          <View style={[styles.card, SHADOWS.card]}>
            <LinearGradient
              colors={['rgba(241,7,163,0.1)', 'rgba(26,26,26,0)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Input
              label="Display Name"
              placeholder="How should we call you?"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <Input
              label="Email"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <Input
              label="Password"
              placeholder="At least 6 characters"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              placeholder="Repeat your password"
              isPassword
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />

            <Text style={styles.sectionLabel}>I am</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.label}
                  style={styles.genderOption}
                  onPress={() => setGender(g.label)}
                  activeOpacity={0.8}
                >
                  {gender === g.label ? (
                    <LinearGradient
                      colors={COLORS.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.genderGradient}
                    >
                      <Ionicons name={g.iconName} size={22} color={COLORS.white} style={{ marginBottom: 4 }} />
                      <Text style={styles.genderLabelSelected}>{g.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.genderInner}>
                      <Ionicons name={g.iconName} size={22} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
                      <Text style={styles.genderLabel}>{g.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <GradientButton label="Create Account" onPress={handleRegister} loading={loading} />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>
              Already have an account?{'  '}
              <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  orb1: {
    position: 'absolute',
    top: 100,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123,47,247,0.15)',
  },
  orb2: {
    position: 'absolute',
    bottom: 200,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(241,7,163,0.1)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  backGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  backText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  header: { marginBottom: SPACING.lg },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  genderOption: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  genderGradient: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  genderInner: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardElevated,
  },
  genderLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  genderLabelSelected: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  loginBtn: { alignItems: 'center', paddingVertical: SPACING.xs },
  loginText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  loginLink: { color: COLORS.pink, fontWeight: '700' },
});
