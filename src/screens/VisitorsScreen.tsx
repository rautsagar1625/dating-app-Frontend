import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppList } from '../components/AppList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { visitsApi, VisitorItem } from '../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const PLACEHOLDER_IMG = 'https://randomuser.me/api/portraits/lego/1.jpg';

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function VisitorsScreen() {
  const navigation = useNavigation<Nav>();
  const [visitors, setVisitors] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchVisitors = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setError(false);
    try {
      const res = await visitsApi.getVisitors({ limit: 50 });
      setVisitors(res.data.data);
      setError(false);
    } catch {
      setError(true);
      if (!isRefresh) setVisitors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const renderVisitor = ({ item }: { item: VisitorItem }) => {
    const { visitor, visitedAt } = item;
    const name = visitor.username ?? 'Unknown';
    const handle = visitor.displayUsername ?? '';
    const avatar = visitor.avatarUrl ?? PLACEHOLDER_IMG;

    return (
      <TouchableOpacity
        style={[styles.card, SHADOWS.card]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProfileDetail', { userId: visitor.userId })}
      >
        <LinearGradient
          colors={['rgba(123,47,247,0.06)', 'rgba(241,7,163,0.04)', 'rgba(26,26,26,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {visitor.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
              {visitor.age ? `, ${visitor.age}` : ''}
            </Text>
            {visitor.isPrivatePhoto && (
              <View style={styles.privatePill}>
                <Ionicons name="lock-closed" size={10} color={COLORS.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
          <Text style={styles.time}>{timeAgo(visitedAt)}</Text>
        </View>

        {/* Arrow */}
        <View style={styles.arrowWrapper}>
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.arrowGradient}
          >
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={styles.backCircle}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Visitors</Text>
            <Text style={styles.subtitle}>Who checked you out</Text>
          </View>

          {visitors.length > 0 && (
            <View style={styles.countPill}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.countPillGradient}
              >
                <Text style={styles.countPillText}>{visitors.length}</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>Loading visitors...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.errorTitle}>Couldn't load visitors</Text>
            <Text style={styles.errorSubtitle}>Check your connection and try again</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchVisitors()} activeOpacity={0.8}>
              <LinearGradient colors={COLORS.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGrad}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <AppList
            data={visitors}
            keyExtractor={(item) => item.visitId}
            renderItem={renderVisitor}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchVisitors(true)}
                tintColor={COLORS.purple}
              />
            }
            ListHeaderComponent={
              visitors.length > 0 ? (
                <Text style={styles.listHint}>
                  Sorted by most recent · tap to view profile
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyIcon}
                >
                  <Ionicons name="eye" size={34} color={COLORS.white} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No visitors yet</Text>
                <Text style={styles.emptySubtitle}>
                  When someone views your profile{'\n'}they'll appear here
                </Text>
              </View>
            }
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  title: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 1 },
  countPill: { borderRadius: RADIUS.full, overflow: 'hidden' },
  countPillGradient: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    minWidth: 32,
    alignItems: 'center',
  },
  countPillText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '800' },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  errorTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700', marginTop: SPACING.sm },
  errorSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  retryBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.md },
  retryBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  retryBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  listHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    gap: SPACING.md,
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardElevated,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.card,
  },

  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  name: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    flexShrink: 1,
  },
  privatePill: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  handle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  time: { color: COLORS.purple, fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 1 },

  arrowWrapper: { borderRadius: RADIUS.full, overflow: 'hidden' },
  arrowGradient: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '700' },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
