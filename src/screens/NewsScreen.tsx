import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { AppList } from '../components/AppList';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../services/toast';
import { newsApi, type NewsPost } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { formatLastSeen } from '../utils/formatLastSeen';

const CATEGORY_COLORS: Record<string, string> = {
  update:       COLORS.purple,
  tip:          '#00C9A7',
  event:        '#F107A3',
  announcement: '#FF6B35',
};

const CATEGORY_LABELS: Record<string, string> = {
  update:       'Update',
  tip:          'Tip',
  event:        'Event',
  announcement: 'Announcement',
};

const CATEGORIES = ['All', 'update', 'tip', 'event', 'announcement'];

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const color = active ? (CATEGORY_COLORS[label.toLowerCase()] ?? COLORS.purple) : COLORS.cardElevated;
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: color, borderColor: active ? color : COLORS.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label === 'All' ? 'All' : (CATEGORY_LABELS[label] ?? label)}
      </Text>
    </TouchableOpacity>
  );
}

function NewsCard({ post, index }: { post: NewsPost; index: number }) {
  const catColor = CATEGORY_COLORS[post.category] ?? COLORS.purple;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} style={styles.card}>
      {post.imageUrl ? (
        <Animated.Image
          source={{ uri: post.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[`${catColor}33`, 'transparent']}
          style={styles.cardImagePlaceholder}
        >
          <Ionicons name="newspaper-outline" size={32} color={catColor} />
        </LinearGradient>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: `${catColor}22`, borderColor: `${catColor}55` }]}>
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Text>
          </View>
          {post.publishedAt && (
            <Text style={styles.dateText}>{formatLastSeen(post.publishedAt)}</Text>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.cardExcerpt} numberOfLines={3}>{post.content}</Text>
      </View>
    </Animated.View>
  );
}

export default function NewsScreen() {
  const [posts,       setPosts]       = useState<NewsPost[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const category = activeCategory === 'All' ? undefined : activeCategory;
      const res = await newsApi.list(1, category);
      setPosts(res.data.data ?? []);
    } catch {
      toast.show('Could not load news', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>News</Text>
          <Text style={styles.headerSub}>Latest updates from Velvet</Text>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ gap: SPACING.sm }}>
                <SkeletonLoader width="100%" height={160} borderRadius={RADIUS.xl} />
                <SkeletonLoader width="70%" height={14} borderRadius={7} />
                <SkeletonLoader width="90%" height={12} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : (
          <AppList
            data={posts}
            keyExtractor={(item) => item.id}
            estimatedItemSize={280}
            renderItem={({ item, index }) => <NewsCard post={item} index={index} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(true); }}
                tintColor={COLORS.purple}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="newspaper-outline"
                title="No news yet"
                description="Check back soon for updates, tips, and events from Velvet."
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  flex:   { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  headerSub:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  catRow: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  chipText:       { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  skeletonWrap:   { padding: SPACING.lg, gap: SPACING.xl },
  listContent:    { padding: SPACING.lg, gap: SPACING.lg },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: {
    width: '100%', height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: SPACING.md },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  categoryBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  dateText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  cardTitle: {
    color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700',
    marginBottom: 6, lineHeight: 22,
  },
  cardExcerpt: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.sm, lineHeight: 18,
  },
});
