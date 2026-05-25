import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppList } from '../components/AppList';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppStackParamList } from '../navigation/types';
import { notificationsApi, chatApi, usersApi, type NotificationItem } from '../services/api';
import { useNotificationStore } from '../store/notificationStore';
import { COLORS, FONTS, SPACING, SHADOWS } from '../utils/theme';
import { NotificationRowSkeleton } from '../components/SkeletonLoader';
import { AnimatedPressable } from '../components/AnimatedPressable';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; body: string }
> = {
  LIKE:    { icon: 'heart',      color: COLORS.pink,   label: 'New Like',    body: 'Someone liked your profile'    },
  MESSAGE: { icon: 'chatbubble', color: COLORS.purple, label: 'New Message', body: 'You have a new message'        },
  VISIT:   { icon: 'eye',        color: COLORS.gold,   label: 'New Visitor', body: 'Someone visited your profile'  },
};

// Pure function — called per-item, not worth memoizing globally
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Extracted so FlashList doesn't recreate it on every parent render
const NotificationRow = React.memo(function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}) {
  const cfg = TYPE_CONFIG[item.type];
  return (
    <AnimatedPressable
      style={[styles.row, !item.isRead && styles.rowUnread]}
      onPress={() => onPress(item)}
      haptic={false}
      pressedScale={0.98}
    >
      <LinearGradient
        colors={[cfg.color + '33', cfg.color + '11']}
        style={styles.iconWrap}
      >
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </LinearGradient>

      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{cfg.label}</Text>
          <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.rowBody}>{cfg.body}</Text>
      </View>

      {!item.isRead && <View style={styles.dot} />}
    </AnimatedPressable>
  );
});

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { setUnreadCount } = useNotificationStore();
  const qc = useQueryClient();

  // ── Data via TanStack Query ───────────────────────────────────────────────

  const { data: notifications = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsApi.getNotifications({ limit: 50 });
      setUnreadCount(res.data.meta?.unreadCount ?? 0);
      return res.data.data ?? [];
    },
    staleTime: 30 * 1000,
    gcTime:    5 * 60 * 1000,
  });

  // Refetch whenever the tab comes into focus (notifications change while on other tabs)
  useFocusEffect(useCallback(() => {
    const state = qc.getQueryState(['notifications']);
    const age = Date.now() - (state?.dataUpdatedAt ?? 0);
    if (age > 30_000) refetch();
  }, []));

  // ── Mark-read mutation ────────────────────────────────────────────────────

  const markReadMutation = useMutation({
    mutationFn: (ids: string[] | 'all') =>
      notificationsApi.markRead(ids === 'all' ? { all: true } : { ids }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData<NotificationItem[]>(['notifications']);
      qc.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        ids === 'all'
          ? old?.map((n) => ({ ...n, isRead: true }))
          : old?.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(['notifications'], ctx?.prev);
      Alert.alert('Error', 'Could not update notifications');
    },
    onSuccess: (res) => {
      setUnreadCount(res.data.data?.unreadCount ?? 0);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePress = useCallback(async (item: NotificationItem) => {
    if (!item.isRead) markReadMutation.mutate([item.id]);

    if (item.type === 'LIKE' || item.type === 'VISIT') {
      navigation.navigate('ProfileDetail', { userId: item.referenceId });
    } else if (item.type === 'MESSAGE') {
      try {
        const [, userRes] = await Promise.all([
          chatApi.startChat(item.referenceId),
          usersApi.getById(item.referenceId),
        ]);
        const userName = userRes.data.data.username ?? 'User';
        navigation.navigate('Chat', { userId: item.referenceId, userName });
      } catch { /* non-critical */ }
    }
  }, [navigation, markReadMutation]);

  const hasUnread = notifications.some((n) => !n.isRead);

  const renderItem = useCallback(({ item }: { item: NotificationItem }) => (
    <NotificationRow item={item} onPress={handlePress} />
  ), [handlePress]);

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn} pressedScale={0.9}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.title}>Activity</Text>
        {hasUnread && (
          <AnimatedPressable
            onPress={() => markReadMutation.mutate('all')}
            style={styles.markAllBtn}
            pressedScale={0.93}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </AnimatedPressable>
        )}
      </View>

      {isLoading ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => <NotificationRowSkeleton key={i} />)}
        </View>
      ) : (
        <AppList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          estimatedItemSize={72}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <LinearGradient colors={COLORS.gradient.glass} style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                Activity from likes, messages, and visitors will appear here.
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
  root:      { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: SPACING.sm },
  title: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  markAllBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: 8, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  markAllText: { fontSize: FONTS.sizes.sm, color: COLORS.purple, fontWeight: '600' },
  list: { paddingVertical: SPACING.sm },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.md },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  emptyBody: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  rowUnread: { backgroundColor: 'rgba(123,47,247,0.05)' },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 3 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  rowTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  rowBody: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purple },
});
