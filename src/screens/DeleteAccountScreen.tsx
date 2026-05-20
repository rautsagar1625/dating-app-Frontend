import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/Input';
import { analytics } from '../services/analytics';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<any, 'DeleteAccount'> };

const DELETION_REASONS = [
  'I found someone',
  'Too many notifications',
  'Privacy concerns',
  'App performance issues',
  'Taking a break',
  'Other',
];

export default function DeleteAccountScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep]         = useState<'warn' | 'confirm'>('warn');
  const [password, setPassword] = useState('');
  const [reason, setReason]     = useState('');
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleRequestExport = async () => {
    try {
      await authApi.requestDataExport();
      Alert.alert('Data Export Requested', 'You will receive an email with your data within 48 hours.');
    } catch {
      Alert.alert('Error', 'Could not request data export. Please contact support.');
    }
  };

  const handleDelete = async () => {
    if (!password) { setError('Please enter your password to confirm'); return; }
    if (!understood) { setError('Please confirm you understand this is irreversible'); return; }
    setError('');
    setLoading(true);
    try {
      analytics.track('account_delete_started');
      await authApi.deleteAccount({ password, reason: reason || undefined });
      analytics.track('account_deleted');
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been scheduled for deletion. You will be signed out now.',
        [{ text: 'OK', onPress: () => logout() }],
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete account. Check your password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Warning step ──────────────────────────────────────────────────────────

  if (step === 'warn') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#2A0A0A', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Warning icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="warning" size={48} color={COLORS.error} />
            </View>
            <Text style={styles.title}>Delete Your Account</Text>
            <Text style={styles.subtitle}>
              This is a permanent and irreversible action. Please read carefully before continuing.
            </Text>

            {/* Consequences */}
            <View style={styles.consequenceCard}>
              {[
                { icon: 'chatbubbles-outline', text: 'All your messages will be permanently deleted' },
                { icon: 'heart-dislike-outline', text: 'All matches and connections will be removed' },
                { icon: 'images-outline', text: 'All uploaded photos will be erased' },
                { icon: 'diamond-outline', text: 'Any unused credits will be forfeited' },
                { icon: 'card-outline', text: 'Active subscriptions will be cancelled' },
              ].map((item, i) => (
                <View key={i} style={styles.consequenceRow}>
                  <View style={styles.consequenceIcon}>
                    <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color={COLORS.error} />
                  </View>
                  <Text style={styles.consequenceText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Data export */}
            <View style={styles.exportCard}>
              <Ionicons name="download-outline" size={20} color={COLORS.purple} />
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitle}>Download Your Data</Text>
                <Text style={styles.exportSubtitle}>Get a copy of your data before deleting</Text>
              </View>
              <TouchableOpacity onPress={handleRequestExport}>
                <Text style={styles.exportBtn}>Request</Text>
              </TouchableOpacity>
            </View>

            {/* Retention offer */}
            <View style={styles.retentionCard}>
              <Text style={styles.retentionTitle}>Need a break instead?</Text>
              <Text style={styles.retentionSubtitle}>
                You can pause your account visibility without losing your data.
              </Text>
              <TouchableOpacity
                style={styles.retentionBtn}
                onPress={() => { navigation.navigate('PrivacySettings'); }}
              >
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.retentionBtnGradient}
                >
                  <Text style={styles.retentionBtnText}>Pause Instead</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Continue to delete */}
            <TouchableOpacity style={styles.deleteOutlineBtn} onPress={() => setStep('confirm')}>
              <Text style={styles.deleteOutlineBtnText}>I still want to delete my account</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Confirm step ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#2A0A0A', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('warn')}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Final Confirmation</Text>
          <Text style={styles.subtitle}>Enter your password to permanently delete your account.</Text>

          <View style={styles.card}>
            {/* Reason picker */}
            <Text style={styles.reasonLabel}>Why are you leaving? (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonScroll}>
              {DELETION_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                  onPress={() => setReason(r === reason ? '' : r)}
                >
                  <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Password"
              placeholder="Confirm with your password"
              isPassword
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              error={error}
            />

            {/* Understood checkbox */}
            <Pressable
              style={styles.checkRow}
              onPress={() => setUnderstood(!understood)}
            >
              <View style={[styles.checkbox, understood && styles.checkboxChecked]}>
                {understood && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.checkLabel}>
                I understand this action is <Text style={styles.checkBold}>permanent and irreversible</Text>
              </Text>
            </Pressable>
          </View>

          {/* Delete button */}
          <TouchableOpacity
            style={[styles.deleteBtn, (!understood || loading) && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!understood || loading}
          >
            {loading
              ? <Text style={styles.deleteBtnText}>Deleting…</Text>
              : (
                <View style={styles.deleteBtnInner}>
                  <Ionicons name="trash" size={18} color={COLORS.white} />
                  <Text style={styles.deleteBtnText}>Delete My Account</Text>
                </View>
              )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelDeleteText}>Cancel — Keep my account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.md },
  iconWrap: {
    width: 96, height: 96, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,69,58,0.12)', alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center', marginVertical: SPACING.lg,
  },
  title: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  consequenceCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)',
    marginBottom: SPACING.lg, gap: SPACING.md,
  },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  consequenceIcon: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,69,58,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  consequenceText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, flex: 1, lineHeight: 20 },
  exportCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg,
  },
  exportTitle: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  exportSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  exportBtn: { color: COLORS.purple, fontSize: FONTS.sizes.md, fontWeight: '700' },
  retentionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  retentionTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800', marginBottom: SPACING.xs },
  retentionSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  retentionBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  retentionBtnGradient: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  retentionBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
  deleteOutlineBtn: {
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.5)',
    borderRadius: RADIUS.full, paddingVertical: SPACING.md, alignItems: 'center',
  },
  deleteOutlineBtnText: { color: COLORS.error, fontSize: FONTS.sizes.md, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  reasonLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600', marginBottom: SPACING.sm },
  reasonScroll: { marginBottom: SPACING.lg },
  reasonChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, marginRight: SPACING.sm,
  },
  reasonChipActive: { borderColor: COLORS.error, backgroundColor: 'rgba(255,69,58,0.1)' },
  reasonChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  reasonChipTextActive: { color: COLORS.error, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingTop: SPACING.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  checkLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, flex: 1, lineHeight: 22 },
  checkBold: { color: COLORS.text, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: COLORS.error, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, alignItems: 'center', marginBottom: SPACING.md,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  deleteBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '800' },
  cancelDeleteBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  cancelDeleteText: { color: COLORS.purple, fontSize: FONTS.sizes.md, fontWeight: '600' },
});
