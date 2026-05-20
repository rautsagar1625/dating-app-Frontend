import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi, notifPrefsApi, type NotificationPrefs } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { analytics } from '../services/analytics';
import { formatLastSeen } from '../utils/formatLastSeen';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<any, 'AccountSettings'> };
type Section = 'main' | 'changePassword' | 'changeEmail' | 'changePhone' | 'sessions' | 'notifications';

export default function AccountSettingsScreen({ navigation }: Props) {
  const qc          = useQueryClient();
  const user        = useAuthStore((s) => s.user);
  const logout      = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [section, setSection]   = useState<Section>('main');

  // ── Change Password ──────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError]     = useState('');

  // ── Change Email ─────────────────────────────────────────────────────────
  const [newEmail, setNewEmail]   = useState('');
  const [emailPw, setEmailPw]     = useState('');
  const [emailError, setEmailError] = useState('');

  // ── Change Phone ─────────────────────────────────────────────────────────
  const [newPhone, setNewPhone]   = useState('');
  const [phonePw, setPhonePw]     = useState('');
  const [phoneError, setPhoneError] = useState('');

  // ── Sessions ─────────────────────────────────────────────────────────────
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn:  () => authApi.getSessions().then((r) => r.data.data),
    enabled:  section === 'sessions',
  });

  // ── Notification prefs ───────────────────────────────────────────────────
  const { data: notifPrefs } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn:  () => notifPrefsApi.get().then((r) => r.data.data),
    enabled:  section === 'notifications',
  });

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setPwError('');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Success', 'Your password has been updated.');
      setSection('main');
    },
    onError: (err: unknown) => {
      setPwError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update password');
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: () => authApi.changeEmail({ newEmail: newEmail.trim().toLowerCase(), password: emailPw }),
    onSuccess: () => {
      updateProfile({ email: newEmail.trim().toLowerCase() });
      setNewEmail(''); setEmailPw('');
      Alert.alert('Email Updated', 'Please verify your new email address.');
      setSection('main');
    },
    onError: (err: unknown) => {
      setEmailError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update email');
    },
  });

  const changePhoneMutation = useMutation({
    mutationFn: () => authApi.changePhone({ newPhone: newPhone.trim(), password: phonePw }),
    onSuccess: () => {
      updateProfile({ phone: newPhone.trim() });
      setNewPhone(''); setPhonePw('');
      Alert.alert('Success', 'Your phone number has been updated.');
      setSection('main');
    },
    onError: (err: unknown) => {
      setPhoneError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update phone');
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => refetchSessions(),
    onError: () => Alert.alert('Error', 'Could not revoke session.'),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => { logout(); },
    onError: () => Alert.alert('Error', 'Could not sign out of all devices.'),
  });

  const notifMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPrefs>) => notifPrefsApi.update(prefs),
    onSuccess: (_, vars) => qc.setQueryData(['settings', 'notifications'], (old: NotificationPrefs) => ({ ...old, ...vars })),
  });

  const validatePassword = () => {
    if (!currentPw) { setPwError('Enter your current password'); return false; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return false; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return false; }
    return true;
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <TouchableOpacity onPress={() => setSection('main')} style={styles.backInline}>
        <Ionicons name="arrow-back" size={20} color={COLORS.purple} />
        <Text style={styles.backInlineText}>Settings</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const SettingRow = ({
    icon, label, value, onPress, destructive = false,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value?: string;
    onPress: () => void;
    destructive?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon} size={20} color={destructive ? COLORS.error : COLORS.purple} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>{label}</Text>
        {value ? <Text style={styles.settingValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  // ── Main ──────────────────────────────────────────────────────────────────

  if (section === 'main') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Settings</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Account info */}
            <View style={styles.groupHeader}><Text style={styles.groupLabel}>ACCOUNT</Text></View>
            <View style={styles.group}>
              <SettingRow icon="mail-outline"  label="Email"  value={user?.email ?? '—'} onPress={() => setSection('changeEmail')} />
              <View style={styles.groupDivider} />
              <SettingRow icon="call-outline"  label="Phone"  value={user?.phone ?? 'Not set'} onPress={() => setSection('changePhone')} />
              <View style={styles.groupDivider} />
              <SettingRow icon="lock-closed-outline" label="Change Password" onPress={() => setSection('changePassword')} />
            </View>

            {/* Security */}
            <View style={styles.groupHeader}><Text style={styles.groupLabel}>SECURITY</Text></View>
            <View style={styles.group}>
              <SettingRow icon="phone-portrait-outline" label="Active Sessions" onPress={() => setSection('sessions')} />
            </View>

            {/* Notifications */}
            <View style={styles.groupHeader}><Text style={styles.groupLabel}>PREFERENCES</Text></View>
            <View style={styles.group}>
              <SettingRow icon="notifications-outline" label="Notification Preferences" onPress={() => setSection('notifications')} />
            </View>

            {/* Danger zone */}
            <View style={styles.groupHeader}><Text style={styles.groupLabel}>DANGER ZONE</Text></View>
            <View style={styles.group}>
              <SettingRow
                icon="trash-outline"
                label="Delete Account"
                onPress={() => navigation.navigate('DeleteAccount')}
                destructive
              />
            </View>

            <View style={{ height: SPACING.xxl }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Change Password ───────────────────────────────────────────────────────
  if (section === 'changePassword') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <SectionHeader title="Change Password" />
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.card}>
                <Input label="Current Password" isPassword value={currentPw} onChangeText={(v) => { setCurrentPw(v); setPwError(''); }} />
                <Input label="New Password" isPassword value={newPw} onChangeText={(v) => { setNewPw(v); setPwError(''); }} />
                <Input label="Confirm New Password" isPassword value={confirmPw} onChangeText={(v) => { setConfirmPw(v); setPwError(''); }} error={pwError} />
                <GradientButton
                  label="Update Password"
                  onPress={() => { if (validatePassword()) changePwMutation.mutate(); }}
                  loading={changePwMutation.isPending}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Change Email ──────────────────────────────────────────────────────────
  if (section === 'changeEmail') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <SectionHeader title="Change Email" />
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.card}>
                <Input label="New Email Address" keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={(v) => { setNewEmail(v); setEmailError(''); }} />
                <Input label="Current Password" isPassword value={emailPw} onChangeText={(v) => { setEmailPw(v); setEmailError(''); }} error={emailError} />
                <GradientButton
                  label="Update Email"
                  onPress={() => {
                    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) { setEmailError('Enter a valid email'); return; }
                    if (!emailPw) { setEmailError('Password is required'); return; }
                    changeEmailMutation.mutate();
                  }}
                  loading={changeEmailMutation.isPending}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Change Phone ──────────────────────────────────────────────────────────
  if (section === 'changePhone') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <SectionHeader title="Change Phone Number" />
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.card}>
                <Input label="New Phone Number" keyboardType="phone-pad" value={newPhone} onChangeText={(v) => { setNewPhone(v); setPhoneError(''); }} />
                <Input label="Current Password" isPassword value={phonePw} onChangeText={(v) => { setPhonePw(v); setPhoneError(''); }} error={phoneError} />
                <GradientButton
                  label="Update Phone"
                  onPress={() => {
                    if (!newPhone.trim()) { setPhoneError('Enter a phone number'); return; }
                    if (!phonePw) { setPhoneError('Password is required'); return; }
                    changePhoneMutation.mutate();
                  }}
                  loading={changePhoneMutation.isPending}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  if (section === 'sessions') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <SectionHeader title="Active Sessions" />
          <ScrollView contentContainerStyle={styles.formScroll}>
            {sessionsLoading ? (
              <ActivityIndicator color={COLORS.purple} style={{ marginTop: SPACING.xl }} />
            ) : (
              <>
                {sessions?.map((sess) => (
                  <View key={sess.id} style={[styles.sessionCard, sess.isCurrent && styles.sessionCardCurrent]}>
                    <View style={styles.sessionInfo}>
                      <Ionicons
                        name={sess.device.toLowerCase().includes('iphone') ? 'phone-portrait' : 'laptop'}
                        size={20} color={COLORS.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionDevice}>{sess.device}</Text>
                        <Text style={styles.sessionMeta}>{sess.ip} · {formatLastSeen(sess.lastSeen)}</Text>
                      </View>
                      {sess.isCurrent && (
                        <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>This device</Text></View>
                      )}
                    </View>
                    {!sess.isCurrent && (
                      <TouchableOpacity
                        style={styles.revokeBtn}
                        onPress={() => revokeSessionMutation.mutate(sess.id)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        <Text style={styles.revokeBtnText}>Sign out</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.revokeAllBtn}
                  onPress={() => Alert.alert('Sign Out Everywhere', 'You will be signed out of all devices including this one.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out All', style: 'destructive', onPress: () => revokeAllMutation.mutate() },
                  ])}
                  disabled={revokeAllMutation.isPending}
                >
                  <Text style={styles.revokeAllText}>Sign out all devices</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  if (section === 'notifications' && notifPrefs) {
    const prefs = notifPrefs;
    const NOTIF_ROWS: Array<{ key: keyof NotificationPrefs; label: string; description: string }> = [
      { key: 'newMatch',     label: 'New Matches',      description: 'When you get a mutual match' },
      { key: 'newMessage',   label: 'Messages',         description: 'When you receive a message' },
      { key: 'profileVisit', label: 'Profile Visitors', description: 'When someone views your profile' },
      { key: 'photoRequest', label: 'Photo Requests',   description: 'When someone requests private photos' },
      { key: 'promotions',   label: 'Promotions',       description: 'Offers, boosts, and updates' },
      { key: 'weeklyDigest', label: 'Weekly Digest',    description: 'Your weekly activity summary' },
    ];

    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <SectionHeader title="Notifications" />
          <ScrollView contentContainerStyle={styles.formScroll}>
            <View style={styles.group}>
              {NOTIF_ROWS.map((row, i) => (
                <React.Fragment key={row.key}>
                  <View style={styles.notifRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifLabel}>{row.label}</Text>
                      <Text style={styles.notifDesc}>{row.description}</Text>
                    </View>
                    <Switch
                      value={prefs[row.key]}
                      onValueChange={(v) => notifMutation.mutate({ [row.key]: v })}
                      trackColor={{ false: COLORS.border, true: COLORS.purple }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                  {i < NOTIF_ROWS.length - 1 && <View style={styles.groupDivider} />}
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  sectionHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  backInline: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  backInlineText: { color: COLORS.purple, fontSize: FONTS.sizes.md, fontWeight: '600' },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  groupHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.sm },
  groupLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1 },
  group: { backgroundColor: COLORS.card, marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  groupDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 64 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  settingIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(123,47,247,0.12)', alignItems: 'center', justifyContent: 'center' },
  settingIconDestructive: { backgroundColor: 'rgba(255,69,58,0.12)' },
  settingContent: { flex: 1 },
  settingLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  settingLabelDestructive: { color: COLORS.error },
  settingValue: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  formScroll: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  sessionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  sessionCardCurrent: { borderColor: COLORS.purple },
  sessionInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  sessionDevice: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  sessionMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  currentBadge: {
    backgroundColor: 'rgba(123,47,247,0.15)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.purple,
  },
  currentBadgeText: { color: COLORS.purple, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  revokeBtn: { alignSelf: 'flex-end', marginTop: SPACING.sm },
  revokeBtnText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  revokeAllBtn: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.md },
  revokeAllText: { color: COLORS.error, fontSize: FONTS.sizes.md, fontWeight: '700' },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  notifLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  notifDesc: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
});
