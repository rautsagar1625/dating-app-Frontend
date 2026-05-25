import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBlurView } from '../components/AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/types';
import { GradientButton } from '../components/GradientButton';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { usersApi, likesApi, photosApi, visitsApi, chatApi, favoritesApi, blocksApi, reportsApi, BrowseUser, Photo } from '../services/api';
import { GiftPickerModal } from './GiftsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletStore } from '../store/walletStore';
import { formatLastSeen } from '../utils/formatLastSeen';
import { useHaptics } from '../hooks/useHaptics';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ProfileDetail'>;
  route: RouteProp<AppStackParamList, 'ProfileDetail'>;
};

const PLACEHOLDER_IMG = 'https://randomuser.me/api/portraits/lego/1.jpg';
const PHOTO_UNLOCK_COST = 10;
const LOCKED_PLACEHOLDERS = [
  'https://randomuser.me/api/portraits/women/11.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/women/13.jpg',
];

// Unified display shape — same for both API and mock data
interface ProfileDisplay {
  userId: string;
  name: string;
  username: string;
  age: number;
  gender: string;
  location: string;
  bio: string;
  profilePhoto: string;
  isPhotoPrivate: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
}

const fromAPI = (u: BrowseUser): ProfileDisplay => ({
  userId: u.userId,
  name: u.username,
  username: u.displayUsername ?? `@${u.username}`,
  age: u.age ?? 0,
  gender: u.gender ?? '',
  location: u.location ?? '',
  bio: u.bio ?? '',
  profilePhoto: u.photos?.[0]?.url ?? PLACEHOLDER_IMG,
  isPhotoPrivate: u.isPrivatePhoto,
  isOnline: u.isOnline,
  lastSeenAt: u.lastSeenAt ?? null,
});

export default function ProfileDetailScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const syncBalance = useWalletStore((s) => s.syncBalance);
  const haptics = useHaptics();

  const [profile, setProfile] = useState<ProfileDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosAccessGranted, setPhotosAccessGranted] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      usersApi.getById(userId),
      favoritesApi.check(userId).catch(() => null),
      photosApi.getUserPhotos(userId).catch(() => null),
    ])
      .then(([profileRes, favRes, photosRes]) => {
        if (!cancelled) {
          setProfile(fromAPI(profileRes.data.data));
          setFavorited(favRes?.data?.data?.isFavorited ?? false);
          if (photosRes) {
            setPhotos(photosRes.data.data ?? []);
            setPhotosAccessGranted(photosRes.data.accessGranted);
          }
          setLoading(false);
          visitsApi.recordVisit(userId).catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  const handleLike = async () => {
    if (liked || likeLoading) return;
    setLikeLoading(true);
    setLiked(true);
    haptics.medium();
    try {
      await likesApi.sendLike(userId);
    } catch {
      setLiked(false);
      haptics.error();
    } finally {
      setLikeLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    const wasOn = favorited;
    setFavorited(!wasOn); // optimistic
    try {
      if (wasOn) {
        await favoritesApi.remove(userId);
      } else {
        await favoritesApi.add(userId);
      }
    } catch {
      setFavorited(wasOn); // rollback
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Options',
      undefined,
      [
        {
          text: 'Report',
          onPress: () =>
            Alert.alert('Report User', 'Why are you reporting this user?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Spam or scam', onPress: () => reportsApi.report(userId, 'Spam or scam').catch(() => {}) },
              { text: 'Inappropriate content', onPress: () => reportsApi.report(userId, 'Inappropriate content').catch(() => {}) },
              { text: 'Fake profile', onPress: () => reportsApi.report(userId, 'Fake profile').catch(() => {}) },
            ]),
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Block User',
              `${profile?.name ?? 'This user'} won't be able to see you, and you won't see them.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    try { await blocksApi.block(userId); } catch { /* already blocked */ }
                    navigation.goBack();
                  },
                },
              ],
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleUnlockPhotos = async () => {
    if (unlockLoading || photosAccessGranted) return;
    setUnlockLoading(true);
    try {
      const res = await photosApi.unlockPhotos(userId);
      syncBalance(res.data.data.newBalance);
      const photosRes = await photosApi.getUserPhotos(userId);
      setPhotos(photosRes.data.data ?? []);
      setPhotosAccessGranted(true);
      haptics.success();
    } catch (err: any) {
      if (err?.response?.status === 402) {
        haptics.error();
        Alert.alert('Not enough credits', 'Add more credits in your Wallet to unlock private photos.');
      }
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (chatLoading) return;
    setChatLoading(true);
    try {
      // Ensure chat row exists before navigating; ChatScreen will handle lock/unlock UI
      await chatApi.startChat(userId);
    } catch {
      // Non-fatal — ChatScreen will call startChat itself on mount
    } finally {
      setChatLoading(false);
    }
    navigation.navigate('Chat', {
      userId,
      userName: profile?.name ?? 'User',
      userAvatar: profile?.profilePhoto,
    });
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerState}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.notFoundText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* ── Hero ── */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: profile.profilePhoto }} style={styles.heroImage} />
          {profile.isPhotoPrivate && (
            <AppBlurView intensity={65} tint="dark" style={StyleSheet.absoluteFillObject} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(15,15,15,1)']}
            locations={[0.4, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back */}
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <AppBlurView intensity={40} tint="dark" style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </AppBlurView>
          </TouchableOpacity>

          {/* More options */}
          <TouchableOpacity style={[styles.moreBtn, { top: insets.top + 12 }]} onPress={handleMoreOptions} activeOpacity={0.8}>
            <AppBlurView intensity={40} tint="dark" style={styles.backCircle}>
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.white} />
            </AppBlurView>
          </TouchableOpacity>

          {/* Online badge */}
          {profile.isOnline && (
            <View style={[styles.onlineBadge, { top: insets.top + 12 }]}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online now</Text>
            </View>
          )}

          {/* Private badge */}
          {profile.isPhotoPrivate && (
            <View style={styles.privateHero}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.privateHeroGradient}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="lock-closed" size={11} color={COLORS.white} />
                  <Text style={styles.privateHeroText}>Private Profile</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Name overlay — lightweight: name, age, handle only */}
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{profile.name}</Text>
              {profile.age > 0 && <Text style={styles.heroAge}>, {profile.age}</Text>}
            </View>
            <Text style={styles.heroUsername}>{profile.username}</Text>
            <View style={styles.lastSeenRow}>
              {profile.isOnline && <View style={styles.lastSeenDot} />}
              <Text style={[styles.heroLastSeen, profile.isOnline && styles.heroLastSeenOnline]}>
                {formatLastSeen(profile.lastSeenAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={styles.infoCard}>

          {/* Quick-scan tags */}
          <View style={styles.tagsRow}>
            {!!profile.location && (
              <View style={styles.tag}>
                <LinearGradient
                  colors={['rgba(123,47,247,0.15)', 'rgba(123,47,247,0.05)']}
                  style={styles.tagGradient}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.tagText}>{profile.location}</Text>
                  </View>
                </LinearGradient>
              </View>
            )}
            {!!profile.gender && (
              <View style={styles.tag}>
                <LinearGradient
                  colors={['rgba(241,7,163,0.15)', 'rgba(241,7,163,0.05)']}
                  style={styles.tagGradient}
                >
                  <Text style={styles.tagText}>{profile.gender}</Text>
                </LinearGradient>
              </View>
            )}
            <View style={styles.tag}>
              <LinearGradient
                colors={profile.isOnline
                  ? ['rgba(48,209,88,0.15)', 'rgba(48,209,88,0.05)']
                  : ['rgba(136,136,136,0.15)', 'rgba(136,136,136,0.05)']}
                style={styles.tagGradient}
              >
                <Text style={[styles.tagText, profile.isOnline && { color: COLORS.success }]}>
                  {profile.isOnline ? '● Online' : '○ Offline'}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Bio — preview only, not full profile */}
          {!!profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.bioCard}>
                <LinearGradient
                  colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
              </View>
            </View>
          )}

          {/* Private Gallery */}
          {profile.isPhotoPrivate && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Private Gallery</Text>
                {photosAccessGranted ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.unlockedBadgeText}>Unlocked</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.lockedBadge}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="lock-closed" size={11} color={COLORS.white} />
                      <Text style={styles.lockedBadgeText}>Locked</Text>
                    </View>
                  </LinearGradient>
                )}
              </View>

              {photosAccessGranted ? (
                <View style={styles.photoGrid}>
                  {photos.filter((p) => p.isPrivate).length > 0
                    ? photos.filter((p) => p.isPrivate).map((photo) => (
                        <View key={photo.id} style={[styles.photoThumb, SHADOWS.card]}>
                          <Image source={{ uri: photo.url }} style={styles.thumbImg} />
                        </View>
                      ))
                    : photos.map((photo) => (
                        <View key={photo.id} style={[styles.photoThumb, SHADOWS.card]}>
                          <Image source={{ uri: photo.url }} style={styles.thumbImg} />
                        </View>
                      ))
                  }
                  {photos.length === 0 && (
                    <Text style={styles.noPhotosText}>No photos uploaded yet</Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.photoGrid}>
                    {LOCKED_PLACEHOLDERS.map((uri, i) => (
                      <View key={i} style={[styles.photoThumb, SHADOWS.card]}>
                        <Image source={{ uri }} style={styles.thumbImg} />
                        <AppBlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />
                        <LinearGradient
                          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View style={styles.thumbLockIcon}>
                          <LinearGradient colors={COLORS.gradient.primary} style={styles.thumbLockGradient}>
                            <Ionicons name="lock-closed" size={18} color={COLORS.white} />
                          </LinearGradient>
                        </View>
                      </View>
                    ))}
                  </View>
                  <GradientButton
                    label={unlockLoading ? 'Unlocking...' : `Unlock Photos · ${PHOTO_UNLOCK_COST} credits`}
                    onPress={handleUnlockPhotos}
                    size="md"
                    icon={
                      unlockLoading
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Ionicons name="key-outline" size={16} color={COLORS.white} />
                    }
                    disabled={unlockLoading}
                    style={{ marginTop: SPACING.md }}
                  />
                </>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Floating footer CTA ── */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['rgba(15,15,15,0)', 'rgba(15,15,15,0.95)', COLORS.background]}
          locations={[0, 0.3, 1]}
          style={styles.footerGradient}
        />
        <View style={styles.footerRow}>
          {/* Like → Crush system */}
          <TouchableOpacity
            onPress={handleLike}
            style={[styles.iconBtn, liked && styles.iconBtnLiked, SHADOWS.glowPink]}
            activeOpacity={liked ? 1 : 0.85}
          >
            {liked ? (
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBtnGradient}
              >
                <Ionicons name="heart" size={22} color={COLORS.white} />
              </LinearGradient>
            ) : (
              <View style={styles.iconBtnInner}>
                {likeLoading ? (
                  <ActivityIndicator size="small" color={COLORS.purple} />
                ) : (
                  <Ionicons name="heart-outline" size={22} color={COLORS.textMuted} />
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Chat → locked by default */}
          <GradientButton
            label={chatLoading ? 'Opening...' : 'Start Chat'}
            onPress={handleStartChat}
            size="lg"
            icon={
              chatLoading
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
            }
            disabled={chatLoading}
            style={styles.chatBtn}
          />

          {/* Send Gift */}
          <TouchableOpacity
            onPress={() => setShowGiftPicker(true)}
            style={styles.iconBtn}
            activeOpacity={0.85}
          >
            <View style={styles.iconBtnInner}>
              <Text style={{ fontSize: 18 }}>🎁</Text>
            </View>
          </TouchableOpacity>

          {/* Save / Favorite */}
          <TouchableOpacity
            onPress={handleFavorite}
            style={[styles.iconBtn, favorited && styles.iconBtnFavorited]}
            activeOpacity={0.85}
          >
            {favorited ? (
              <LinearGradient
                colors={COLORS.gradient.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBtnGradient}
              >
                <Ionicons name="bookmark" size={20} color={COLORS.white} />
              </LinearGradient>
            ) : (
              <View style={styles.iconBtnInner}>
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color={COLORS.gold} />
                ) : (
                  <Ionicons name="bookmark-outline" size={20} color={COLORS.textMuted} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Gift picker */}
      <GiftPickerModal
        visible={showGiftPicker}
        receiverId={userId}
        onClose={() => setShowGiftPicker(false)}
        onSent={() => setShowGiftPicker(false)}
      />
    </View>
  );
}

const THUMB_SIZE = (width - SPACING.lg * 2 - SPACING.sm * 2) / 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  notFoundText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },

  heroWrapper: { height: width * 1.15, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  moreBtn: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {},
  onlineBadge: {
    position: 'absolute',
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  onlineText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  privateHero: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.lg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  privateHeroGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  privateHeroText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  heroInfo: { position: 'absolute', bottom: SPACING.xl, left: SPACING.lg },
  nameRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroName: { color: COLORS.white, fontSize: FONTS.sizes.xxxl, fontWeight: '800' },
  heroAge: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xxl, fontWeight: '600' },
  heroUsername: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, marginTop: 2 },
  lastSeenRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  lastSeenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  heroLastSeen: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  heroLastSeenOnline: { color: COLORS.success, fontWeight: '600' },

  infoCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    marginTop: -RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  tag: { borderRadius: RADIUS.full, overflow: 'hidden' },
  tagGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  lockedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  lockedBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48,209,88,0.12)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
  },
  unlockedBadgeText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  noPhotosText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, paddingVertical: SPACING.md },
  bioCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  bio: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, lineHeight: 24 },

  photoGrid: { flexDirection: 'row', gap: SPACING.sm },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbLockIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLockGradient: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLockEmoji: {},

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerGradient: { position: 'absolute', top: -40, left: 0, right: 0, height: 100 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  iconBtn: { width: 52, height: 52, borderRadius: RADIUS.full, overflow: 'hidden' },
  iconBtnLiked: {},
  iconBtnFavorited: {},
  iconBtnGradient: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnInner: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chatBtn: { flex: 1 },
});
