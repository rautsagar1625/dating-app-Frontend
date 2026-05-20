import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppList } from '../components/AppList';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { favoritesApi, likesApi, chatApi, FavoriteItem } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Favorites'>;
};

const PLACEHOLDER = 'https://randomuser.me/api/portraits/lego/1.jpg';

export default function FavoritesScreen({ navigation }: Props) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liking, setLiking] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [chatting, setChatting] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) { setLoading(true); setError(false); }
    try {
      const res = await favoritesApi.getAll();
      setFavorites(res.data.data ?? []);
      setError(false);
    } catch {
      setError(true);
      if (!isRefresh) setFavorites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnfavorite = useCallback((targetUserId: string) => {
    // Optimistic remove
    setFavorites((prev) => prev.filter((f) => f.user.userId !== targetUserId));
    favoritesApi.remove(targetUserId).catch(() => {
      // Rollback on failure
      load();
    });
  }, [load]);

  const handleLike = useCallback(async (targetUserId: string) => {
    if (liked[targetUserId] || liking[targetUserId]) return;
    setLiking((p) => ({ ...p, [targetUserId]: true }));
    setLiked((p) => ({ ...p, [targetUserId]: true })); // optimistic
    try {
      await likesApi.sendLike(targetUserId);
    } catch {
      setLiked((p) => ({ ...p, [targetUserId]: false }));
    } finally {
      setLiking((p) => ({ ...p, [targetUserId]: false }));
    }
  }, [liked, liking]);

  const handleChat = useCallback(async (item: FavoriteItem) => {
    if (chatting) return;
    setChatting(item.user.userId);
    try {
      await chatApi.startChat(item.user.userId);
      navigation.navigate('Chat', {
        userId: item.user.userId,
        userName: item.user.username ?? 'User',
        userAvatar: item.user.avatarUrl ?? undefined,
      });
    } catch (err: any) {
      const isBlocked = err?.response?.status === 403;
      Alert.alert(
        isBlocked ? 'Cannot Message' : 'Error',
        isBlocked
          ? 'You cannot send messages to this user.'
          : 'Could not open chat. Please try again.',
      );
    } finally {
      setChatting(null);
    }
  }, [chatting, navigation]);

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const { user } = item;
    const isLiked = liked[user.userId];
    const isLiking = liking[user.userId];
    const isChatting = chatting === user.userId;

    return (
      <View style={[styles.card, SHADOWS.card]}>
        <LinearGradient
          colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Avatar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ProfileDetail', { userId: user.userId })}
          activeOpacity={0.85}
        >
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.avatarUrl ?? PLACEHOLDER }} style={styles.avatar} />
            {user.isOnline && <View style={styles.onlineDot} />}
          </View>
        </TouchableOpacity>

        {/* Info */}
        <TouchableOpacity
          style={styles.info}
          onPress={() => navigation.navigate('ProfileDetail', { userId: user.userId })}
          activeOpacity={0.85}
        >
          <Text style={styles.name} numberOfLines={1}>
            {user.username ?? 'User'}{user.age ? `, ${user.age}` : ''}
          </Text>
          <View style={styles.metaRow}>
            {!!user.location && (
              <>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.meta} numberOfLines={1}>{user.location}</Text>
              </>
            )}
            {user.isOnline && (
              <Text style={[styles.meta, styles.online]}>● Online</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Like */}
          <TouchableOpacity
            style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
            onPress={() => handleLike(user.userId)}
            activeOpacity={0.8}
          >
            {isLiked ? (
              <LinearGradient colors={COLORS.gradient.primary} style={styles.actionBtnGradient}>
                <Ionicons name="heart" size={16} color={COLORS.white} />
              </LinearGradient>
            ) : isLiking ? (
              <ActivityIndicator size="small" color={COLORS.purple} />
            ) : (
              <Ionicons name="heart-outline" size={16} color={COLORS.textMuted} />
            )}
          </TouchableOpacity>

          {/* Chat */}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => handleChat(item)}
            activeOpacity={0.85}
            disabled={!!isChatting}
          >
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chatBtnGradient}
            >
              {isChatting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="chatbubble-outline" size={14} color={COLORS.white} />
              )}
              <Text style={styles.chatBtnText}>{isChatting ? 'Opening...' : 'Chat'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Unsave */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleUnfavorite(user.userId)}
            activeOpacity={0.8}
          >
            <Ionicons name="bookmark" size={16} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.count}>{favorites.length}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Couldn't load saved profiles</Text>
          <Text style={styles.errorBody}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.8}>
            <LinearGradient colors={COLORS.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGrad}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <AppList
          data={favorites}
          keyExtractor={(item) => item.favoriteId}
          renderItem={renderItem}
          contentContainerStyle={favorites.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={COLORS.purple}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <LinearGradient colors={COLORS.gradient.glass} style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={40} color={COLORS.textMuted} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No saved profiles</Text>
              <Text style={styles.emptyBody}>
                Tap the bookmark on any profile to save them for later.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  count: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  errorTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  errorBody: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  retryBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.xs },
  retryBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  retryBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.md },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  emptyBody: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    gap: SPACING.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  online: { color: COLORS.success, fontWeight: '600' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  actionBtnLiked: { borderColor: 'transparent' },
  actionBtnGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  chatBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    height: 36,
    borderRadius: RADIUS.full,
  },
  chatBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
