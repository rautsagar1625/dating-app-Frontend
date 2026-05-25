import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBlurView } from '../components/AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { AppStackParamList, MainTabParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { Input } from '../components/Input';
import { GradientButton } from '../components/GradientButton';
import { Modal } from '../components/Modal';
import { SkeletonBone } from '../components/SkeletonLoader';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { authApi, profileApi, walletApi, chatApi, photosApi, visitsApi, likesApi, favoritesApi, Photo } from '../services/api';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<AppStackParamList>
>;

type MenuItem = {
  iconName: 'diamond-outline' | 'notifications-outline' | 'lock-closed-outline' | 'help-circle-outline' | 'star-outline' | 'shield-checkmark-outline';
  label: string;
  sublabel: string;
  screen?: keyof AppStackParamList;
};

const MENU_ITEMS: MenuItem[] = [
  { iconName: 'diamond-outline',       label: 'Subscription',     sublabel: 'Manage plan & credits',   screen: 'Subscription' },
  { iconName: 'notifications-outline', label: 'Notifications',    sublabel: 'Manage alerts' },
  { iconName: 'lock-closed-outline',   label: 'Privacy Settings', sublabel: 'Control who sees you',    screen: 'PrivacySettings' },
  { iconName: 'help-circle-outline',   label: 'Help & Support',   sublabel: 'Get assistance' },
  { iconName: 'star-outline',          label: 'Rate Velvet',      sublabel: 'Share your experience' },
];

const PLACEHOLDER_IMG = 'https://randomuser.me/api/portraits/lego/1.jpg';

export default function MyProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateProfile, logout } = useAuthStore();
  const { credits, syncBalance } = useWalletStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [privatePhoto, setPrivatePhoto] = useState(user?.isPrivatePhoto || false);

  const qc = useQueryClient();

  // ── Parallel data queries (replaces 7 fire-and-forget useEffect calls) ───
  const [
    meQuery, walletQuery, chatsQuery, photosQuery,
    visitorsQuery, likesQuery, favoritesQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['profile', 'me'],
        queryFn: () => authApi.getMe().then((r) => r.data.data.user),
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['wallet', 'balance'],
        queryFn: () => walletApi.getBalance().then((r) => r.data.data.balance as number),
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['chats'],
        queryFn: () => chatApi.getChats().then((r) => r.data.data),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['photos', 'me', user?.id],
        queryFn: () => user?.id
          ? photosApi.getUserPhotos(user.id).then((r) => r.data.data as Photo[])
          : Promise.resolve([] as Photo[]),
        staleTime: 2 * 60 * 1000,
        enabled: !!user?.id,
      },
      {
        queryKey: ['visitors', 'preview'],
        queryFn: () => visitsApi.getVisitors({ limit: 3 }).then((r) => r.data.data),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['likes', 'received'],
        queryFn: () => likesApi.getLikesReceived().then((r) => r.data.data),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['favorites', 'preview'],
        queryFn: () => favoritesApi.getAll({ limit: 3 }).then((r) => r.data.data),
        staleTime: 2 * 60 * 1000,
      },
    ],
  });

  // Sync side-effects from query results
  React.useEffect(() => {
    if (meQuery.data) {
      const u = meQuery.data;
      updateProfile(u);
      setBio(u.bio ?? '');
      setLocation(u.location ?? '');
      setPrivatePhoto(u.isPrivatePhoto ?? false);
    }
  }, [meQuery.data]);

  React.useEffect(() => {
    if (walletQuery.data !== undefined) syncBalance(walletQuery.data);
  }, [walletQuery.data]);

  // Refetch on tab focus if data is stale
  useFocusEffect(useCallback(() => {
    const keys = [
      ['profile', 'me'], ['wallet', 'balance'],
      ['chats'], ['photos', 'me', user?.id],
      ['visitors', 'preview'], ['likes', 'received'], ['favorites', 'preview'],
    ];
    keys.forEach((key) => {
      const state = qc.getQueryState(key);
      const age = Date.now() - (state?.dataUpdatedAt ?? 0);
      if (age > 60_000) qc.invalidateQueries({ queryKey: key });
    });
  }, [user?.id]));

  // Derived values
  const myPhotos: Photo[]     = photosQuery.data ?? [];
  const avatarUrl             = myPhotos[0]?.url ?? user?.profilePhoto ?? null;
  const visitorCount          = visitorsQuery.data?.length ?? 0;
  const visitorAvatars        = (visitorsQuery.data ?? []).map((v: any) => v.visitor?.avatarUrl ?? PLACEHOLDER_IMG);
  const crushCount            = likesQuery.data?.length ?? 0;
  const mutualCount           = (likesQuery.data ?? []).filter((c: any) => c.isMutual).length;
  const crushAvatars          = (likesQuery.data ?? []).slice(0, 3).map((c: any) => c.user?.avatarUrl ?? PLACEHOLDER_IMG);
  const favoriteCount         = favoritesQuery.data?.length ?? 0;
  const favoriteAvatars       = (favoritesQuery.data ?? []).slice(0, 3).map((f: any) => f.user?.avatarUrl ?? PLACEHOLDER_IMG);
  const chatCount             = chatsQuery.data?.length ?? 0;
  const isDataLoading         = meQuery.isLoading || photosQuery.isLoading;

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.upsertProfile({
        username: (user?.username ?? '').replace('@', '').trim(),
        age: user?.age ?? undefined,
        gender: user?.gender ?? undefined,
        location,
        bio,
        isPrivatePhoto: privatePhoto,
      });
      updateProfile({ bio, location, isPrivatePhoto: privatePhoto });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const STATS: { label: string; value: string; iconName: 'diamond' | 'heart' | 'chatbubble'; iconColor: string }[] = [
    { label: 'Credits', value: credits.toString(), iconName: 'diamond', iconColor: COLORS.gold },
    { label: 'Likes', value: crushCount.toString(), iconName: 'heart', iconColor: COLORS.pink },
    { label: 'Chats', value: chatCount.toString(), iconName: 'chatbubble', iconColor: COLORS.purple },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.pageTitle}>My Profile</Text>
              <Text style={styles.pageSubtitle}>Manage your presence</Text>
            </View>
            <TouchableOpacity
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
              activeOpacity={0.85}
              style={styles.editBtnWrapper}
              disabled={saving}
            >
              <LinearGradient
                colors={isEditing ? COLORS.gradient.gold : COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editBtn}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={13} color={COLORS.white} />
                  <Text style={styles.editBtnText}>{saving ? 'Saving…' : isEditing ? 'Save' : 'Edit'}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Avatar hero section */}
          <View style={[styles.avatarCard, SHADOWS.card]}>
            <LinearGradient
              colors={['rgba(123,47,247,0.18)', 'rgba(241,7,163,0.1)', 'rgba(26,26,26,0)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatarBorder, SHADOWS.glow]}>
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradientRing}
                  >
                    <Image
                      source={{ uri: avatarUrl || PLACEHOLDER_IMG }}
                      style={styles.avatar}
                    />
                  </LinearGradient>
                </View>
                <View style={styles.onlineDot} />
                {isEditing && (
                  <TouchableOpacity style={styles.cameraOverlay} activeOpacity={0.85}>
                    <AppBlurView intensity={60} tint="dark" style={styles.cameraBlur}>
                      <Ionicons name="camera" size={14} color={COLORS.white} />
                    </AppBlurView>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || 'Your Name'}</Text>
                <Text style={styles.userHandle}>{user?.username || '@username'}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.locationText}>{user?.location || 'Location not set'}</Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <View style={styles.statItem}>
                    <Ionicons name={s.iconName} size={18} color={s.iconColor} />
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                  {i < STATS.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Visitors teaser */}
          <TouchableOpacity
            style={[styles.visitorsCard, SHADOWS.card]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Visitors')}
          >
            <LinearGradient
              colors={['rgba(123,47,247,0.18)', 'rgba(241,7,163,0.1)', 'rgba(26,26,26,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.visitorsLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="eye-outline" size={16} color={COLORS.text} />
                <Text style={styles.visitorsTitle}>Visitors</Text>
              </View>
              <Text style={styles.visitorsSubtitle}>
                {visitorCount > 0
                  ? `${visitorCount} ${visitorCount === 1 ? 'person' : 'people'} visited your profile`
                  : 'No visitors yet — be active!'}
              </Text>
            </View>
            <View style={styles.visitorsAvatars}>
              {visitorAvatars.slice(0, 3).map((uri, i) => (
                <View key={i} style={[styles.visitorAvatarWrapper, { marginLeft: i > 0 ? -14 : 0, zIndex: 3 - i }]}>
                  <Image source={{ uri }} style={styles.visitorAvatar} />
                  <AppBlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
                </View>
              ))}
              {visitorAvatars.length === 0 && (
                <View style={styles.visitorAvatarEmpty}>
                  <Text style={styles.visitorAvatarEmptyText}>?</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Crushes teaser */}
          <TouchableOpacity
            style={[styles.visitorsCard, SHADOWS.card, { marginTop: SPACING.sm }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Crushes')}
          >
            <LinearGradient
              colors={['rgba(241,7,163,0.18)', 'rgba(123,47,247,0.1)', 'rgba(26,26,26,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.visitorsLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="heart" size={16} color={COLORS.pink} />
                <Text style={styles.visitorsTitle}>Crushes</Text>
                {mutualCount > 0 && (
                  <View style={styles.mutualBadge}>
                    <Text style={styles.mutualBadgeText}>{mutualCount} mutual</Text>
                  </View>
                )}
              </View>
              <Text style={styles.visitorsSubtitle}>
                {crushCount > 0
                  ? `${crushCount} ${crushCount === 1 ? 'person' : 'people'} liked your profile`
                  : 'No crushes yet — keep swiping!'}
              </Text>
            </View>
            <View style={styles.visitorsAvatars}>
              {crushAvatars.slice(0, 3).map((uri, i) => (
                <View key={i} style={[styles.visitorAvatarWrapper, { marginLeft: i > 0 ? -14 : 0, zIndex: 3 - i }]}>
                  <Image source={{ uri }} style={styles.visitorAvatar} />
                  <AppBlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
                </View>
              ))}
              {crushAvatars.length === 0 && (
                <View style={styles.visitorAvatarEmpty}>
                  <Ionicons name="heart" size={14} color={COLORS.textMuted} />
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Favorites teaser */}
          <TouchableOpacity
            style={[styles.visitorsCard, SHADOWS.card, { marginTop: SPACING.sm }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Favorites')}
          >
            <LinearGradient
              colors={['rgba(245,200,66,0.15)', 'rgba(201,160,32,0.08)', 'rgba(26,26,26,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.visitorsLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="bookmark" size={16} color={COLORS.gold} />
                <Text style={styles.visitorsTitle}>Saved</Text>
              </View>
              <Text style={styles.visitorsSubtitle}>
                {favoriteCount > 0
                  ? `${favoriteCount} saved ${favoriteCount === 1 ? 'profile' : 'profiles'}`
                  : 'Save profiles to revisit later'}
              </Text>
            </View>
            <View style={styles.visitorsAvatars}>
              {favoriteAvatars.slice(0, 3).map((uri, i) => (
                <View key={i} style={[styles.visitorAvatarWrapper, { marginLeft: i > 0 ? -14 : 0, zIndex: 3 - i }]}>
                  <Image source={{ uri }} style={styles.visitorAvatar} />
                </View>
              ))}
              {favoriteAvatars.length === 0 && (
                <View style={styles.visitorAvatarEmpty}>
                  <Ionicons name="bookmark-outline" size={14} color={COLORS.textMuted} />
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Profile Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Info</Text>
            <View style={[styles.card, SHADOWS.card]}>
              <LinearGradient
                colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
                style={StyleSheet.absoluteFillObject}
              />
              {isEditing ? (
                <>
                  <Input
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell others about yourself..."
                    multiline
                    numberOfLines={3}
                  />
                  <Input
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="City, Country"
                  />
                  <View style={styles.toggleRow}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="lock-closed-outline" size={14} color={COLORS.text} />
                        <Text style={styles.toggleLabel}>Private Photos</Text>
                      </View>
                      <Text style={styles.toggleDesc}>Require approval to view</Text>
                    </View>
                    <Switch
                      value={privatePhoto}
                      onValueChange={setPrivatePhoto}
                      trackColor={{ false: COLORS.border, true: COLORS.purple }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                </>
              ) : (
                <>
                  <InfoRow icon={<Ionicons name="document-text-outline" size={18} color={COLORS.purple} />} label="Bio" value={user?.bio || 'No bio yet'} />
                  <InfoRow icon={<Ionicons name="location-outline" size={18} color={COLORS.purple} />} label="Location" value={user?.location || 'Not set'} />
                  <InfoRow icon={<Ionicons name="calendar-outline" size={18} color={COLORS.purple} />} label="Age" value={user?.age?.toString() || 'Not set'} />
                  <InfoRow icon={<Ionicons name="person-outline" size={18} color={COLORS.purple} />} label="Gender" value={user?.gender || 'Not set'} />
                  <InfoRow icon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.purple} />} label="Photos" value={user?.isPrivatePhoto ? 'Private' : 'Public'} />
                </>
              )}
            </View>
          </View>

          {/* Photo Grid */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>My Photos</Text>
              <TouchableOpacity activeOpacity={0.8}>
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addPhotoBtn}
                >
                  <Text style={styles.addPhotoText}>+ Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.photoGrid}>
              {myPhotos.length === 0 ? (
                <View style={[styles.photoThumb, SHADOWS.card, styles.photoEmpty]}>
                  <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
                  <Text style={styles.photoEmptyText}>No photos yet</Text>
                </View>
              ) : (
                myPhotos.map((photo, i) => (
                  <View key={photo.id} style={[styles.photoThumb, SHADOWS.card]}>
                    <Image source={{ uri: photo.url }} style={styles.thumbImg} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {i === 0 && (
                      <View style={styles.mainBadge}>
                        <LinearGradient
                          colors={COLORS.gradient.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.mainBadgeGradient}
                        >
                          <Text style={styles.mainBadgeText}>Main</Text>
                        </LinearGradient>
                      </View>
                    )}
                    {photo.isPrivate && (
                      <View style={styles.privateLockOverlay}>
                        <Ionicons name="lock-closed" size={18} color={COLORS.white} />
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={[styles.card, SHADOWS.card]}>
              <LinearGradient
                colors={['rgba(241,7,163,0.06)', 'rgba(26,26,26,0)']}
                style={StyleSheet.absoluteFillObject}
              />
              {user?.role === 'admin' && (
                <View>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Admin')}
                  >
                    <LinearGradient
                      colors={['#7B2FF7', '#F107A3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.menuIconWrapper}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.white} />
                    </LinearGradient>
                    <View style={styles.menuContent}>
                      <Text style={[styles.menuLabel, { color: COLORS.purple }]}>Admin Panel</Text>
                      <Text style={styles.menuSublabel}>Moderation & user management</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.separator} />
                </View>
              )}
              {MENU_ITEMS.map((item, i) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={item.screen ? () => navigation.navigate(item.screen as any) : undefined}
                  >
                    <View style={styles.menuIconWrapper}>
                      <Ionicons name={item.iconName} size={18} color={COLORS.text} />
                    </View>
                    <View style={styles.menuContent}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  {i < MENU_ITEMS.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>

          {/* Sign out */}
          <GradientButton
            label="Sign Out"
            onPress={() => setShowLogoutModal(true)}
            variant="outline"
            size="md"
            style={{ marginBottom: SPACING.xl }}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Logout Confirm Modal */}
      <Modal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out?"
        description="You'll need to sign in again to access your account."
        primaryLabel="Sign Out"
        onPrimary={() => {
          setShowLogoutModal(false);
          logout();
        }}
        secondaryLabel="Stay"
        onSecondary={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrapper}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 3) / 4;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pageTitle: { color: COLORS.text, fontSize: FONTS.sizes.xxxl, fontWeight: '800' },
  pageSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  editBtnWrapper: { borderRadius: RADIUS.full, overflow: 'hidden' },
  editBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  editBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.sm },

  avatarCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  avatarWrapper: { position: 'relative' },
  avatarBorder: { borderRadius: RADIUS.full },
  avatarGradientRing: {
    padding: 3,
    borderRadius: RADIUS.full,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2.5,
    borderColor: COLORS.card,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  cameraBlur: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {},
  userInfo: { flex: 1, gap: 4 },
  userName: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  userHandle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationIcon: {},
  locationText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statEmoji: {},
  statValue: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.xs },

  section: { marginBottom: SPACING.xl },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  addPhotoBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  addPhotoText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  infoIconWrapper: { width: 28, alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '500', marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  toggleLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  toggleDesc: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.2,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  mainBadgeGradient: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  mainBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  privateLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  photoEmptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  menuIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuEmoji: {},
  menuContent: { flex: 1 },
  menuLabel: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  menuSublabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  menuArrow: {},
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },

  visitorsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    gap: SPACING.sm,
  },
  visitorsLeft: { flex: 1 },
  visitorsTitle: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700' },
  visitorsSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 3 },
  visitorsAvatars: { flexDirection: 'row', alignItems: 'center' },
  visitorAvatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  visitorAvatar: { width: '100%', height: '100%' },
  visitorAvatarEmpty: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visitorAvatarEmptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.lg, fontWeight: '300' },
  visitorsArrow: {},
  mutualBadge: {
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mutualBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
});
