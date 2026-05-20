import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { authApi, walletApi, notificationsApi } from '../services/api';
import { collectFingerprint } from '../utils/fingerprint';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const { height } = Dimensions.get('window');
type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const login = useAuthStore((s) => s.login);
  const { syncBalance } = useWalletStore();
  const { setUnreadCount } = useNotificationStore();

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const deviceFingerprint = await collectFingerprint().catch(() => undefined);
      const res = await authApi.login({ email, password, deviceFingerprint });
      const { user, token } = res.data.data;
      login(user, token);

      // Sync wallet and notification count in background
      walletApi.getBalance().then((r) => syncBalance(r.data.data.balance)).catch(() => {});
      notificationsApi.getNotifications({ limit: 1 }).then((r) => setUnreadCount(r.data.meta?.unreadCount ?? 0)).catch(() => {});
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? 'Login failed. Check your credentials.';
      Alert.alert('Sign In Failed', msg);
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
      {/* Decorative glow orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.header}>
            <View style={[styles.logoWrapper, SHADOWS.glow]}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="heart" size={36} color={COLORS.white} />
              </LinearGradient>
            </View>
            <Text style={styles.brand}>Velvet</Text>
            <Text style={styles.tagline}>Privacy. Discretion. Connection.</Text>
          </View>

          {/* Glass card form */}
          <View style={[styles.card, SHADOWS.card]}>
            <LinearGradient
              colors={['rgba(123,47,247,0.12)', 'rgba(26,26,26,0)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>

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
              placeholder="Your password"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />

            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <GradientButton label="Sign In" onPress={handleLogin} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>
                Don't have an account?{'  '}
                <Text style={styles.registerLink}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
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
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(123,47,247,0.18)',
  },
  orb2: {
    position: 'absolute',
    top: height * 0.35,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(241,7,163,0.12)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoWrapper: {
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: COLORS.text,
    fontSize: FONTS.sizes.hero,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    letterSpacing: 1,
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
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.lg,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
  forgotText: {
    color: COLORS.purple,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.sm,
  },
  registerBtn: { alignItems: 'center', paddingVertical: SPACING.xs },
  registerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  registerLink: { color: COLORS.pink, fontWeight: '700' },
  disclaimer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
