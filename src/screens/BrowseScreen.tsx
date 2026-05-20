import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppList } from '../components/AppList';
import { useHaptics } from '../hooks/useHaptics';

import { AppStackParamList } from '../navigation/types';
import { MockUser } from '../utils/mockData';
import { UserCard } from '../components/UserCard';
import { SwipeCard, type SwipeCardRef } from '../components/SwipeCard';
import { MatchCelebration } from '../components/MatchCelebration';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Chip } from '../components/ui/Chip';
import { Sheet } from '../components/ui/Sheet';
import { Input } from '../components/Input';
import { SkeletonBone, UserCardSkeleton } from '../components/SkeletonLoader';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { usersApi, likesApi, type BrowseUser } from '../services/api';
import { useAuthStore } from '../store/authStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<AppStackParamList>;

const CHIP_FILTERS = ['All', 'Women', 'Men', 'Online'] as const;
type ChipFilter = typeof CHIP_FILTERS[number];

const PLACEHOLDER_IMG = 'https://randomuser.me/api/portraits/lego/1.jpg';
const RECOMMENDED_SCORE_THRESHOLD = 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.54;

interface AdvancedFilters {
  ageMin: string;
  ageMax: string;
  location: string;
}

const EMPTY_FILTERS: AdvancedFilters = { ageMin: '', ageMax: '', location: '' };

function toMockUser(u: BrowseUser): MockUser {
  return {
    id: u.userId,
    name: u.username,
    username: u.displayUsername ?? `@${u.username}`,
    age: u.age ?? 0,
    gender: u.gender ?? '',
    location: u.location ?? '',
    bio: u.bio ?? '',
    profilePhoto: u.photos?.[0]?.url ?? PLACEHOLDER_IMG,
    privatePhoto: u.photos?.[0]?.url ?? PLACEHOLDER_IMG,
    isPhotoPrivate: u.isPrivatePhoto,
    isOnline: u.isOnline,
    liked: false,
    recommended: (u.score ?? 0) >= RECOMMENDED_SCORE_THRESHOLD,
  };
}

interface MatchData {
  matchedUserId: string;
  matchedUserName: string;
  matchedUserAvatar?: string;
  myAvatar?: string;
}

// Memoized grid card to prevent re-renders from parent likedIds updates
const GridCard = React.memo(function GridCard({
  user, liked, onPress, onLike,
}: { user: MockUser; liked: boolean; onPress: () => void; onLike: () => void }) {
  return <UserCard user={user} liked={liked} onPress={onPress} onLike={onLike} />;
});

// Memoized skeleton cards for grid loading state
function GridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => <UserCardSkeleton key={i} />)}
    </View>
  );
}

export default function BrowseScreen() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const haptics = useHaptics();

  const [activeFilter, setActiveFilter] = useState<ChipFilter>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);

  const swipeCardRef = useRef<SwipeCardRef>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const queryKey = useMemo(() => ['browse', appliedFilters] as const, [appliedFilters]);

  const { data: rawUsers = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      usersApi.browse({
        age_min: appliedFilters.ageMin ? parseInt(appliedFilters.ageMin, 10) : undefined,
        age_max: appliedFilters.ageMax ? parseInt(appliedFilters.ageMax, 10) : undefined,
        location:  appliedFilters.location || undefined,
      }).then((r) => r.data.data.map(toMockUser)),
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });

  // Prefetch next page of results when running low
  const currentTotal = rawUsers.length;
  React.useEffect(() => {
    if (currentIndex > 0 && currentTotal - currentIndex < 5) {
      qc.prefetchQuery({
        queryKey: ['browse', appliedFilters, 'next'],
        queryFn:  () => usersApi.browse({}).then((r) => r.data.data.map(toMockUser)),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [currentIndex, currentTotal]);

  // Refetch on screen focus after a long absence
  useFocusEffect(useCallback(() => {
    if (qc.getQueryState(queryKey)?.dataUpdatedAt) {
      const age = Date.now() - (qc.getQueryState(queryKey)?.dataUpdatedAt ?? 0);
      if (age > 10 * 60 * 1000) refetch();
    }
  }, [queryKey]));

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeFilter === 'Women') return rawUsers.filter((u) => u.gender === 'Female');
    if (activeFilter === 'Men')   return rawUsers.filter((u) => u.gender === 'Male');
    if (activeFilter === 'Online') return rawUsers.filter((u) => u.isOnline);
    return rawUsers;
  }, [rawUsers, activeFilter]);

  const current  = filtered[currentIndex];
  const nextUser = filtered[currentIndex + 1];

  const activeAdvancedCount = useMemo(
    () => [appliedFilters.ageMin, appliedFilters.ageMax, appliedFilters.location].filter(Boolean).length,
    [appliedFilters],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const advance = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  const optimisticLike = useCallback((userId: string) => {
    setLikedIds((prev) => { const next = new Set(prev); next.add(userId); return next; });
  }, []);

  const handleLike = useCallback(async () => {
    if (!current) return;
    haptics.medium();
    optimisticLike(current.id);
    advance();
    try {
      const res = await likesApi.sendLike(current.id);
      const resp = res.data as any;
      if (resp?.data?.isMatch) {
        setMatchData({
          matchedUserId:     current.id,
          matchedUserName:   current.name,
          matchedUserAvatar: current.profilePhoto,
          myAvatar:          currentUser?.profilePhoto ?? undefined,
        });
      }
    } catch {
      setLikedIds((prev) => { const next = new Set(prev); next.delete(current.id); return next; });
    }
  }, [current, advance, optimisticLike, currentUser]);

  const handlePass = useCallback(() => {
    haptics.light();
    advance();
  }, [advance]);

  const handleSuperLike = useCallback(async () => {
    if (!current) return;
    haptics.success();
    optimisticLike(current.id);
    advance();
    try {
      await likesApi.sendLike(current.id);
    } catch {
      setLikedIds((prev) => { const next = new Set(prev); next.delete(current.id); return next; });
    }
  }, [current, advance, optimisticLike]);

  const toggleLike = useCallback((id: string) => {
    const isLiked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(id) : next.add(id);
      return next;
    });
    if (isLiked) {
      likesApi.removeLike(id).catch(() => {
        setLikedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
      });
    } else {
      likesApi.sendLike(id).catch(() => {
        setLikedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      });
    }
  }, [likedIds]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ageMin, ageMax, location: locationFilter });
    setCurrentIndex(0);
    setShowFilterSheet(false);
  }, [ageMin, ageMax, locationFilter]);

  const handleResetFilters = useCallback(() => {
    setAgeMin(''); setAgeMax(''); setLocationFilter('');
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentIndex(0);
    setShowFilterSheet(false);
  }, []);

  // ── Grid renderer ─────────────────────────────────────────────────────────

  const renderGridItem = useCallback(({ item }: { item: MockUser }) => (
    <GridCard
      user={item}
      liked={likedIds.has(item.id)}
      onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
      onLike={() => toggleLike(item.id)}
    />
  ), [likedIds, navigation, toggleLike]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Discover</Text>
            <Text style={styles.subGreeting}>Find your mystery</Text>
          </View>
          <View style={styles.headerButtons}>
            {/* Filter button */}
            <AnimatedPressable
              style={styles.viewToggle}
              onPress={() => setShowFilterSheet(true)}
              haptic
            >
              <LinearGradient
                colors={activeAdvancedCount > 0 ? COLORS.gradient.primary : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={styles.viewToggleGradient}
              >
                <Ionicons name="options-outline" size={18} color={COLORS.white} />
                {activeAdvancedCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeAdvancedCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </AnimatedPressable>

            {/* Grid/stack toggle */}
            <AnimatedPressable
              style={styles.viewToggle}
              onPress={() => setShowGrid((v) => !v)}
              haptic
            >
              <LinearGradient
                colors={showGrid ? COLORS.gradient.primary : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={styles.viewToggleGradient}
              >
                <Ionicons
                  name={showGrid ? 'layers-outline' : 'grid-outline'}
                  size={18}
                  color={COLORS.white}
                />
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {CHIP_FILTERS.map((f) => (
            <Chip
              key={f}
              label={f}
              selected={activeFilter === f}
              onPress={() => { setActiveFilter(f); setCurrentIndex(0); }}
            />
          ))}
        </View>

        {/* ── Content ────────────────────────────────────────────────────── */}

        {isLoading ? (
          showGrid ? (
            <GridSkeleton />
          ) : (
            <View style={styles.cardStackSkeleton}>
              <SkeletonBone width="100%" height={CARD_HEIGHT} borderRadius={RADIUS.xxl} />
              <View style={styles.counterRow}>
                <SkeletonBone width={60} height={14} borderRadius={7} />
              </View>
              <View style={styles.actions}>
                <SkeletonBone width={56} height={56} borderRadius={28} />
                <SkeletonBone width={72} height={72} borderRadius={36} />
                <SkeletonBone width={56} height={56} borderRadius={28} />
              </View>
            </View>
          )
        ) : isError ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Couldn't load profiles</Text>
            <AnimatedPressable onPress={() => refetch()}>
              <Text style={styles.retryLink}>Tap to retry</Text>
            </AnimatedPressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No profiles found</Text>
            <Text style={styles.emptySubtitle}>Try changing your filters</Text>
          </View>
        ) : showGrid ? (
          <AppList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderGridItem}
            numColumns={2}
            estimatedItemSize={220}
            contentContainerStyle={styles.gridList}
            showsVerticalScrollIndicator={false}
          />
        ) : currentIndex >= filtered.length ? (
          <View style={styles.centerState}>
            <LinearGradient colors={COLORS.gradient.glass} style={styles.emptyIconWrap}>
              <Ionicons name="flame-outline" size={40} color={COLORS.purple} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>You've seen everyone!</Text>
            <Text style={styles.emptySubtitle}>Check back soon for new profiles</Text>
            <AnimatedPressable
              onPress={() => { setCurrentIndex(0); refetch(); }}
              style={styles.refreshBtn}
            >
              <LinearGradient colors={COLORS.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.refreshBtnGrad}>
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {/* Next card peek — static, no gesture */}
            {nextUser && (
              <View style={[styles.nextCardPeek, { pointerEvents: 'none' }]}>
                <UserCard user={nextUser} liked={likedIds.has(nextUser.id)} fullScreen />
              </View>
            )}

            {/* Current card with swipe gesture — re-key on index to reset transform */}
            <View style={styles.currentCard}>
              <SwipeCard
                key={current.id}
                ref={swipeCardRef}
                onSwipeRight={handleLike}
                onSwipeLeft={handlePass}
                onSwipeSuperLike={handleSuperLike}
              >
                <UserCard
                  user={current}
                  liked={likedIds.has(current.id)}
                  onPress={() => navigation.navigate('ProfileDetail', { userId: current.id })}
                  fullScreen
                />
              </SwipeCard>
            </View>

            <View style={styles.counterRow}>
              <Text style={styles.counter}>{currentIndex + 1} / {filtered.length}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <AnimatedPressable
                onPress={() => swipeCardRef.current?.swipeLeft()}
                style={[styles.passBtn, SHADOWS.card]}
                pressedScale={0.9}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => swipeCardRef.current?.swipeRight()}
                pressedScale={0.88}
              >
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.likeBtn, SHADOWS.glow]}
                >
                  <Ionicons name="heart" size={30} color={COLORS.white} />
                </LinearGradient>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => swipeCardRef.current?.swipeSuperLike()}
                style={{ borderRadius: RADIUS.full, overflow: 'hidden' }}
                pressedScale={0.9}
              >
                <LinearGradient
                  colors={COLORS.gradient.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.superBtn, SHADOWS.glowGold]}
                >
                  <Ionicons name="star" size={22} color={COLORS.white} />
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Advanced filter sheet */}
      <Sheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Profiles"
        snapHeight={0.48}
      >
        <View>
          <Text style={styles.filterSectionLabel}>AGE RANGE</Text>
          <View style={styles.ageRow}>
            <Input
              placeholder="Min"
              value={ageMin}
              onChangeText={setAgeMin}
              keyboardType="numeric"
              maxLength={3}
              containerStyle={styles.ageInput}
            />
            <Text style={styles.ageSep}>—</Text>
            <Input
              placeholder="Max"
              value={ageMax}
              onChangeText={setAgeMax}
              keyboardType="numeric"
              maxLength={3}
              containerStyle={styles.ageInput}
            />
          </View>
          <Input
            label="Location"
            placeholder="e.g. Mumbai, Delhi..."
            value={locationFilter}
            onChangeText={setLocationFilter}
            containerStyle={styles.locationInput}
          />
          <View style={styles.sheetBtns}>
            <AnimatedPressable
              style={[styles.sheetBtn, styles.sheetBtnSecondary]}
              onPress={handleResetFilters}
            >
              <Text style={styles.sheetBtnSecondaryText}>Reset</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.sheetBtn} onPress={handleApplyFilters}>
              <LinearGradient colors={COLORS.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sheetBtnGrad}>
                <Text style={styles.sheetBtnText}>Apply</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
      </Sheet>

      {/* Match celebration */}
      <MatchCelebration
        visible={!!matchData}
        matchData={matchData}
        onMessage={() => {
          setMatchData(null);
          if (matchData) {
            navigation.navigate('Chat', {
              userId: matchData.matchedUserId,
              userName: matchData.matchedUserName,
              userAvatar: matchData.matchedUserAvatar,
            });
          }
        }}
        onKeepSwiping={() => setMatchData(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  greeting: { color: COLORS.text, fontSize: FONTS.sizes.xxxl, fontWeight: '800' },
  subGreeting: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  viewToggle: { borderRadius: RADIUS.md, overflow: 'hidden' },
  viewToggleGradient: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.pink, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  emptyTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '700' },
  emptySubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  retryLink: { color: COLORS.purple, fontSize: FONTS.sizes.md, fontWeight: '600' },
  refreshBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.sm },
  refreshBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  refreshBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },

  gridList: { padding: SPACING.md },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },

  cardStack: { flex: 1, paddingHorizontal: SPACING.lg },
  cardStackSkeleton: { flex: 1, paddingHorizontal: SPACING.lg },
  nextCardPeek: {
    position: 'absolute',
    top: 10, left: SPACING.lg + 14, right: SPACING.lg + 14,
    height: CARD_HEIGHT,
    opacity: 0.4,
    transform: [{ scale: 0.95 }],
    zIndex: 0,
  },
  currentCard: { height: CARD_HEIGHT, zIndex: 1, ...SHADOWS.card },
  counterRow: { alignItems: 'center', paddingVertical: SPACING.sm },
  counter: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  actions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  passBtn: {
    width: 56, height: 56, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  likeBtn: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  superBtn: {
    width: 56, height: 56, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },

  filterSectionLabel: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  ageInput: { flex: 1, marginBottom: 0 },
  ageSep: { color: COLORS.textMuted, fontSize: FONTS.sizes.lg, fontWeight: '300' },
  locationInput: { marginBottom: 0 },
  sheetBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  sheetBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  sheetBtnSecondary: {
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  sheetBtnSecondaryText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, fontWeight: '600' },
  sheetBtnGrad: { paddingVertical: SPACING.md, alignItems: 'center' },
  sheetBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
});
