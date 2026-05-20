import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { settingsApi, AllowMessagesFrom, PrivacySettings } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { PinPad } from '../components/PinPad';
import { useQuickExitStore } from '../store/quickExitStore';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'PrivacySettings'>;
};

const MESSAGE_OPTIONS: { value: AllowMessagesFrom; label: string; sublabel: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { value: 'all',   label: 'Everyone',         sublabel: 'Any user on Velvet can message you',      icon: 'earth-outline' },
  { value: 'liked', label: 'People I\'ve liked', sublabel: 'Only users in your likes list',           icon: 'heart-outline' },
  { value: 'none',  label: 'Nobody',            sublabel: 'Turn off all incoming messages',           icon: 'ban-outline' },
];

export default function PrivacySettingsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isHidden, setIsHidden] = useState(false);
  const [allowMessagesFrom, setAllowMessagesFrom] = useState<AllowMessagesFrom>('all');
  const [saved, setSaved] = useState<PrivacySettings>({ isHidden: false, allowMessagesFrom: 'all' });

  const { pin, setPin, lock } = useQuickExitStore();
  const [pinModalMode, setPinModalMode] = useState<'set' | 'change-verify' | 'change-new' | null>(null);
  const [pinPending, setPinPending] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getPrivacy()
      .then((res) => {
        const data = res.data.data;
        setIsHidden(data.isHidden);
        setAllowMessagesFrom(data.allowMessagesFrom);
        setSaved(data);
      })
      .catch(() => {
        Alert.alert('Error', 'Could not load privacy settings.');
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty = isHidden !== saved.isHidden || allowMessagesFrom !== saved.allowMessagesFrom;

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const res = await settingsApi.updatePrivacy({ isHidden, allowMessagesFrom });
      setSaved(res.data.data);
      Alert.alert('Saved', 'Your privacy settings have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isHidden, allowMessagesFrom, isDirty, saving]);

  const openSetPin = () => { setPinError(null); setPinPending(null); setPinModalMode('set'); };
  const openChangePin = () => { setPinError(null); setPinPending(null); setPinModalMode('change-verify'); };
  const closePinModal = () => { setPinModalMode(null); setPinPending(null); setPinError(null); };

  const handleRemovePin = () => {
    Alert.alert('Remove PIN', 'Quick Exit will still work, but anyone can return to the app without a PIN.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPin(null) },
    ]);
  };

  const handlePinModalComplete = (entered: string) => {
    if (pinModalMode === 'set') {
      if (!pinPending) {
        setPinPending(entered);
        setPinError(null);
      } else {
        if (entered === pinPending) {
          setPin(entered);
          closePinModal();
        } else {
          setPinPending(null);
          setPinError('PINs did not match. Try again.');
        }
      }
    } else if (pinModalMode === 'change-verify') {
      if (entered === pin) {
        setPinError(null);
        setPinModalMode('change-new');
        setPinPending(null);
      } else {
        setPinError('Incorrect PIN');
      }
    } else if (pinModalMode === 'change-new') {
      if (!pinPending) {
        setPinPending(entered);
        setPinError(null);
      } else {
        if (entered === pinPending) {
          setPin(entered);
          closePinModal();
        } else {
          setPinPending(null);
          setPinError('PINs did not match. Try again.');
        }
      }
    }
  };

  const pinModalTitle = (() => {
    if (pinModalMode === 'set') return pinPending ? 'Confirm new PIN' : 'Choose a 4-digit PIN';
    if (pinModalMode === 'change-verify') return 'Enter your current PIN';
    if (pinModalMode === 'change-new') return pinPending ? 'Confirm new PIN' : 'Choose a new PIN';
    return '';
  })();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || saving}
          style={[styles.saveBtn, (!isDirty || saving) && styles.saveBtnDisabled]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={[styles.saveBtnText, (!isDirty || saving) && styles.saveBtnTextDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Visibility ── */}
        <Text style={styles.sectionLabel}>PROFILE VISIBILITY</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <LinearGradient
            colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="eye-off-outline" size={18} color={COLORS.purple} />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Hide my profile</Text>
                <Text style={styles.toggleSublabel}>
                  You won't appear in Browse or search results
                </Text>
              </View>
            </View>
            <Switch
              value={isHidden}
              onValueChange={setIsHidden}
              trackColor={{ false: COLORS.border, true: COLORS.purple }}
              thumbColor={COLORS.white}
            />
          </View>

          {isHidden && (
            <View style={styles.warningRow}>
              <LinearGradient
                colors={['rgba(255,69,58,0.12)', 'rgba(255,69,58,0.04)']}
                style={styles.warningGradient}
              >
                <Ionicons name="warning-outline" size={14} color={COLORS.error} />
                <Text style={styles.warningText}>
                  While hidden, new users cannot find or message you. Existing chats are unaffected.
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* ── Who Can Message Me ── */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>WHO CAN MESSAGE ME</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <LinearGradient
            colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
            style={StyleSheet.absoluteFillObject}
          />
          {MESSAGE_OPTIONS.map((option, i) => {
            const selected = allowMessagesFrom === option.value;
            return (
              <View key={option.value}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setAllowMessagesFrom(option.value)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={selected ? COLORS.purple : COLORS.textMuted}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionSublabel}>{option.sublabel}</Text>
                  </View>
                </TouchableOpacity>
                {i < MESSAGE_OPTIONS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        {/* ── Quick Exit ── */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>QUICK EXIT</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <LinearGradient
            colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Description row */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,69,58,0.12)' }]}>
                <Ionicons name="exit-outline" size={18} color={COLORS.error} />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Quick Exit button</Text>
                <Text style={styles.toggleSublabel}>
                  Instantly cover the app with a neutral screen
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* PIN status + actions */}
          <View style={styles.pinRow}>
            <View style={styles.pinStatus}>
              <Ionicons
                name={pin ? 'lock-closed-outline' : 'lock-open-outline'}
                size={15}
                color={pin ? COLORS.success : COLORS.textMuted}
              />
              <Text style={[styles.pinStatusText, pin && { color: COLORS.success }]}>
                {pin ? 'PIN enabled (••••)' : 'No PIN — anyone can return'}
              </Text>
            </View>
            <View style={styles.pinActions}>
              {pin ? (
                <>
                  <TouchableOpacity style={styles.pinBtn} onPress={openChangePin} activeOpacity={0.75}>
                    <Text style={styles.pinBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pinBtn} onPress={handleRemovePin} activeOpacity={0.75}>
                    <Text style={[styles.pinBtnText, { color: COLORS.error }]}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.pinBtn, styles.pinBtnPrimary]} onPress={openSetPin} activeOpacity={0.75}>
                  <Text style={[styles.pinBtnText, { color: COLORS.white }]}>Set PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Test button */}
          <TouchableOpacity style={styles.testRow} onPress={lock} activeOpacity={0.75}>
            <Ionicons name="play-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.testText}>Test Quick Exit now</Text>
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            Changes take effect immediately for new messages. Existing conversations are not affected.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
      {/* PIN setup modal */}
      <Modal
        visible={pinModalMode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePinModal}
      >
        <SafeAreaView style={styles.pinModal}>
          <View style={styles.pinModalHeader}>
            <TouchableOpacity onPress={closePinModal} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <PinPad
            title={pinModalTitle}
            onComplete={handlePinModalComplete}
            errorMessage={pinError}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: SPACING.sm },
  title: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  saveBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.purple,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.cardElevated },
  saveBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  saveBtnTextDisabled: { color: COLORS.textMuted },

  scroll: { padding: SPACING.md },

  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: SPACING.md,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(123,47,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1 },
  toggleLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  toggleSublabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2, lineHeight: 16 },

  warningRow: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  warningGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
  },
  warningText: { flex: 1, color: COLORS.error, fontSize: FONTS.sizes.sm, lineHeight: 18 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.purple },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.purple,
  },
  optionIcon: {
    width: 28,
    alignItems: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '500' },
  optionLabelSelected: { color: COLORS.text, fontWeight: '700' },
  optionSublabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 52 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
  },

  pinRow: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  pinStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pinStatusText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  pinActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  pinBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardElevated,
  },
  pinBtnPrimary: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  pinBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  testText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },

  pinModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pinModalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'flex-end',
  },
});
