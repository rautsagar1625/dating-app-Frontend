import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { authApi, profileApi, photosApi } from '../services/api';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const GENDERS: { label: string; iconName: 'female' | 'male' | 'people' }[] = [
  { label: 'Woman', iconName: 'female' },
  { label: 'Man', iconName: 'male' },
  { label: 'Other', iconName: 'people' },
];

export default function ProfileSetupScreen() {
  const { updateProfile } = useAuthStore();

  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [privatePhoto, setPrivatePhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3) e.username = 'Min 3 characters';
    if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 80)
      e.age = 'Enter a valid age (18–80)';
    if (!gender) e.gender = 'Please select your gender';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!location.trim()) e.location = 'Location is required';
    if (!bio.trim()) e.bio = 'Tell others a little about yourself';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickPhoto = async () => {
    if (Platform.OS === 'web') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleComplete = async () => {
    if (!validate2()) return;
    setLoading(true);
    try {
      // 1. Save profile to backend
      await profileApi.upsertProfile({
        username: username.replace('@', '').trim(),
        age: Number(age),
        gender,
        location,
        bio,
        isPrivatePhoto: privatePhoto,
      });

      // 2. Upload photo if one was picked
      if (photoUri) {
        await photosApi.uploadPhoto(photoUri);
      }

      // 3. Refresh auth store from server
      const meRes = await authApi.getMe();
      const u = meRes.data.data.user;
      updateProfile({ ...u, isProfileComplete: true });
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? 'Something went wrong';
      if (msg.toLowerCase().includes('username')) {
        setErrors({ username: msg });
        setStep(1);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.orb} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoGradient, SHADOWS.glow]}
            >
              <Ionicons name="heart" size={32} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.title}>
              {step === 1 ? 'Who Are You?' : 'Your Story'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Start building your mystery' : 'Make them curious about you'}
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            {[1, 2].map((s) => (
              <View key={s} style={styles.stepWrapper}>
                {s < step ? (
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    style={styles.stepDone}
                  >
                    <Text style={styles.stepCheckmark}>✓</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.stepCircle, s === step && styles.stepCircleActive]}>
                    <Text style={styles.stepNum}>{s}</Text>
                  </View>
                )}
                <Text style={[styles.stepLabel, s === step && styles.stepLabelActive]}>
                  {s === 1 ? 'Identity' : 'Details'}
                </Text>
              </View>
            ))}
            <View style={[styles.progressLine, step > 1 && styles.progressLineFill]} />
          </View>

          {/* Step 1 */}
          {step === 1 && (
            <View style={[styles.card, SHADOWS.card]}>
              <LinearGradient
                colors={['rgba(123,47,247,0.12)', 'rgba(26,26,26,0)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Input
                label="Username"
                placeholder="@yourhandle"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                error={errors.username}
              />
              <Input
                label="Age"
                placeholder="e.g. 28"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                error={errors.age}
              />

              <Text style={styles.sectionLabel}>Gender</Text>
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
                        <Text style={styles.genderLabelActive}>{g.label}</Text>
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
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

              <GradientButton
                label="Continue →"
                onPress={() => { if (validate1()) setStep(2); }}
              />
            </View>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <View style={[styles.card, SHADOWS.card]}>
              <LinearGradient
                colors={['rgba(241,7,163,0.1)', 'rgba(26,26,26,0)']}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Photo upload */}
              <Text style={styles.sectionLabel}>Profile Photo</Text>
              <TouchableOpacity style={styles.photoArea} onPress={pickPhoto} activeOpacity={0.85}>
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.photoEditBadge}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="pencil" size={11} color={COLORS.white} />
                        <Text style={styles.photoEditText}>Change</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <LinearGradient
                    colors={['rgba(123,47,247,0.1)', 'rgba(241,7,163,0.1)']}
                    style={styles.photoPlaceholder}
                  >
                    <View style={styles.photoCameraIcon}>
                      <LinearGradient
                        colors={COLORS.gradient.primary}
                        style={styles.photoCameraGradient}
                      >
                        <Ionicons name="camera" size={26} color={COLORS.white} />
                      </LinearGradient>
                    </View>
                    <Text style={styles.photoText}>Upload Profile Photo</Text>
                    <Text style={styles.photoHint}>Tap to select from gallery</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <View style={styles.privacyRow}>
                <View style={styles.privacyInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="lock-closed" size={14} color={COLORS.text} />
                    <Text style={styles.privacyLabel}>Private Photo</Text>
                  </View>
                  <Text style={styles.privacyDesc}>Others need your approval to see it</Text>
                </View>
                <Switch
                  value={privatePhoto}
                  onValueChange={setPrivatePhoto}
                  trackColor={{ false: COLORS.border, true: COLORS.purple }}
                  thumbColor={COLORS.white}
                />
              </View>

              <Input
                label="Location"
                placeholder="City, Country"
                value={location}
                onChangeText={setLocation}
                error={errors.location}
              />
              <Input
                label="About Me"
                placeholder="Say something intriguing about yourself..."
                value={bio}
                onChangeText={setBio}
                error={errors.bio}
                multiline
                numberOfLines={4}
                inputHeight={90}
              />

              <View style={styles.btnRow}>
                <GradientButton
                  label="Back"
                  onPress={() => setStep(1)}
                  variant="outline"
                  size="md"
                  icon={<Ionicons name="arrow-back" size={16} color={COLORS.white} />}
                  style={{ flex: 1 }}
                />
                <GradientButton
                  label="Complete"
                  onPress={handleComplete}
                  loading={loading}
                  size="md"
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  orb: {
    position: 'absolute',
    top: 100,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123,47,247,0.15)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 6,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: 18,
    left: '30%',
    right: '30%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  progressLineFill: { backgroundColor: COLORS.purple },
  stepWrapper: { alignItems: 'center', gap: 6, zIndex: 1 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { borderColor: COLORS.purple },
  stepDone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckmark: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  stepNum: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  stepLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  stepLabelActive: { color: COLORS.purple, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
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
  genderRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
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
  },
  genderInner: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardElevated,
  },
  genderLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  genderLabelActive: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  photoArea: {
    height: 180,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.xl,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  photoEditText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.xl,
  },
  photoCameraIcon: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  photoCameraGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  photoText: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  photoHint: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  privacyInfo: { flex: 1 },
  privacyLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  privacyDesc: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
