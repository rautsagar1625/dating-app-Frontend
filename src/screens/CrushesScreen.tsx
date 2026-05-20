import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { AppList } from '../components/AppList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { likesApi, type CrushItem } from '../services/api';
import { SkeletonBone } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const PLACEHOLDER_IMG = 'https://randomuser.me/api/portraits/lego/1.jpg';

// Union type so we can mix section headers and crush items in a single FlashList
type SectionHeader = { _type: 'header'; title: string; hint: string; count: number; isMutual: boolean };
type ListItem = SectionHeader | (CrushItem & { _type: 'item' });

function isSectionHeader(item: ListItem): item is SectionHeader {
  return item._type === 'header';
}

function buildListData(mutual: CrushItem[], oneSided: CrushItem[]): ListItem[] {
  const items: ListItem[] = [];
  if (mutual.length > 0) {
    items.push({
      _type: 'header',
      title: 'Mutual Matches',
      hint: 'You both liked each other — start a conversation',
      count: mutual.length,
      isMutual: true,
    });
    mutual.forEach((c) => items.push({ ...c, _type: 'item' }));
  }
  if (oneSided.length > 0) {
    items.push({
      _type: 'header',
      title: 'Liked You',
      hint: 'Like them back to unlock a mutual match',
      count: oneSided.length,
      isMutual: false,
    });
    oneSided.forEach((c) => items.push({ ...c, _type: 'item' }));
  }
  return items;
}

function CrushSkeleton() {
  return (
    <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <SkeletonBone width={58} height={58} borderRadius={29} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBone width="55%" height={14} borderRadius={7} />
            <SkeletonBone width="35%" height={11} borderRadius={6} />
          </View>
          <SkeletonBone width={30} height={30} borderRadius={15} />
        </View>
      ))}
    </View>
  );
}

export default function CrushesScreen() {
  const navigation = useNavigation<Nav>();
  const [crushes, setCrushes]     = useState<CrushItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);

  const fetchCrushes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await likesApi.getLikesReceived();
      setCrushes(res.data.data ?? []);
    } catch {
      setError(true);
      if (!isRefresh) setCrushes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCrushes(); }, [fetchCrushes]);

  const mutual   = useMemo(() => crushes.filter((c) => c.isMutual), [crushes]);
  const oneSided = useMemo(() => crushes.filter((c) => !c.isMutual), [crushes]);
  const listData = useMemo(() => buildListData(mutual, oneSided), [mutual, oneSided]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (isSectionHeader(item)) {
      return (
        <View style={[styles.sectionWrap, item.isMutual ? {} : styles.sectionWrapSpaced]}>
          <View style={styles.sectionHeader}>
            {item.isMutual ? (
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sectionDot}
              />
            ) : (
              <View style={[styles.sectionDot, { backgroundColor: COLORS.textMuted }]} />
            )}
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <View style={[styles.sectionCount, !item.isMutual && styles.sectionCountMuted]}>
              <Text style={[styles.sectionCountText, !item.isMutual && styles.sectionCountTextMuted]}>
                {item.count}
              </Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>{item.hint}</Text>
        </View>
      );
    }

    const { user, isMutual } = item;
    const name   = user.username ?? 'Unknown';
    const handle = user.displayUsername ?? '';
    const avatar = user.avatarUrl ?? PLACEHOLDER_IMG;

    return (
      <TouchableOpacity
        style={[styles.card, SHADOWS.card, isMutual && styles.mutualCard]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProfileDetail', { userId: user.userId })}
      >
        {isMutual && (
          <LinearGradient
            colors={['rgba(123,47,247,0.15)', 'rgba(241,7,163,0.08)', 'rgba(26,26,26,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {user.isOnline && <View style={styles.onlineDot} />}
          {isMutual && (
            <View style={styles.mutualBadge}>
              <Ionicons name="heart" size={10} color={COLORS.white} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}{user.age ? `, ${user.age}` : ''}
            </Text>
            {user.isPrivatePhoto && (
              <View style={styles.privatePill}>
                <Ionicons name="lock-closed" size={10} color={COLORS.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
          {isMutual ? (
            <View style={styles.mutualLabel}>
              <Ionicons name="heart" size={11} color={COLORS.pink} />
              <Text style={styles.mutualLabelText}>Mutual crush</Text>
            </View>
          ) : (
            <Text style={styles.likedYouText}>Liked you</Text>
          )}
        </View>

        <View style={styles.arrowWrapper}>
          <LinearGradient
            colors={isMutual ? COLORS.gradient.primary : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.arrowGradient}
          >
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Crushes</Text>
            <Text style={styles.subtitle}>People interested in you</Text>
          </View>
          {crushes.length > 0 && (
            <View style={styles.countPill}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.countPillGradient}
              >
                <Text style={styles.countPillText}>{crushes.length}</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {loading ? (
          <CrushSkeleton />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load crushes"
            description="Pull down to retry"
          />
        ) : crushes.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No crushes yet"
            description={`When someone likes your profile\nthey'll appear here`}
          />
        ) : (
          <AppList
            data={listData}
            keyExtractor={(item) =>
              isSectionHeader(item) ? `header-${item.title}` : item.likeId
            }
            renderItem={renderItem}
            estimatedItemSize={80}
            getItemType={(item) => (isSectionHeader(item) ? 'header' : 'item')}
            contentContainerStyle={styles.list}
            onRefresh={() => fetchCrushes(true)}
            refreshing={refreshing}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  titleBlock: { flex: 1 },
  title: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 1 },
  countPill: { borderRadius: RADIUS.full, overflow: 'hidden' },
  countPillGradient: {
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
    borderRadius: RADIUS.full, minWidth: 32, alignItems: 'center',
  },
  countPillText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '800' },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },

  sectionWrap: { paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  sectionWrapSpaced: { paddingTop: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700', flex: 1 },
  sectionCount: {
    backgroundColor: COLORS.purple, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionCountMuted: { backgroundColor: COLORS.cardElevated },
  sectionCountText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  sectionCountTextMuted: { color: COLORS.textMuted },
  sectionHint: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs, letterSpacing: 0.2, marginBottom: SPACING.sm,
  },

  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', gap: SPACING.md,
  },
  mutualCard: { borderColor: 'rgba(123,47,247,0.4)' },

  avatarWrapper: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: RADIUS.full, backgroundColor: COLORS.cardElevated },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.card,
  },
  mutualBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.pink, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.card,
  },

  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  name: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700', flexShrink: 1 },
  privatePill: {
    backgroundColor: COLORS.cardElevated, borderRadius: RADIUS.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  handle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  mutualLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  mutualLabelText: { color: COLORS.pink, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  likedYouText: { color: COLORS.purple, fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 1 },

  arrowWrapper: { borderRadius: RADIUS.full, overflow: 'hidden' },
  arrowGradient: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
});
