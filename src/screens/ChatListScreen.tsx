import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { AppList } from '../components/AppList';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/types';
import { chatApi, type ChatListItem } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { toast } from '../services/toast';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { analytics } from '../services/analytics';
import { formatLastSeen } from '../utils/formatLastSeen';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const PLACEHOLDER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

type Props = { navigation: NativeStackNavigationProp<AppStackParamList, 'ChatList'> };

interface ConversationItemProps {
  item:     ChatListItem;
  onPress:  () => void;
  currentUserId: string;
}

function ConversationItem({ item, onPress, currentUserId }: ConversationItemProps) {
  const isUnread = !!item.lastMessage && item.lastMessage.senderId !== currentUserId && !(item as unknown as { seenAt?: string }).seenAt;
  const lastMsgTime = item.lastMessage
    ? formatLastSeen(item.lastMessage.createdAt)
    : formatLastSeen(item.createdAt);

  return (
    <TouchableOpacity style={styles.convRow} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Animated.Image
          source={{ uri: item.otherUser.avatarUrl ?? PLACEHOLDER_AVATAR }}
          style={styles.avatar}
        />
        {(item as unknown as { isOnline?: boolean }).isOnline && (
          <View style={styles.onlineDot} />
        )}
      </View>

      {/* Content */}
      <View style={styles.convContent}>
        <View style={styles.convTop}>
          <Text style={[styles.convName, isUnread && styles.convNameUnread]} numberOfLines={1}>
            {item.otherUser.username ?? 'User'}
          </Text>
          <Text style={styles.convTime}>{lastMsgTime}</Text>
        </View>
        <View style={styles.convBottom}>
          <Text
            style={[styles.convPreview, isUnread && styles.convPreviewUnread]}
            numberOfLines={1}
          >
            {!item.isUnlocked
              ? '🔒 Locked conversation'
              : item.lastMessage?.message ?? 'Start a conversation'}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatListScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<ChatListItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const { setChatUnreadCount, clearChatUnread } = useNotificationStore();

  const fetchConversations = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await chatApi.getChats();
      const data = res.data.data ?? [];
      setConversations(data);
      // Count conversations with unread messages from the other user
      const unread = data.filter((c: ChatListItem) =>
        c.lastMessage && c.lastMessage.senderId !== currentUser?.id
      ).length;
      setChatUnreadCount(unread);
    } catch {
      toast.show('Could not refresh conversations', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, setChatUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      clearChatUnread(); // Clear badge when user opens the tab
      analytics.screen('ChatList');
    }, [fetchConversations, clearChatUnread]),
  );

  // Real-time: listen for new messages and move conversation to top
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { chatId: string; message: string; senderId: string; createdAt: string }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.chatId);
        if (idx === -1) {
          fetchConversations(true);
          return prev;
        }
        const updated: ChatListItem = {
          ...prev[idx],
          lastMessage: { message: data.message, createdAt: data.createdAt, senderId: data.senderId },
        };
        return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [fetchConversations, currentUser?.id]);

  const handleOpenChat = (item: ChatListItem) => {
    navigation.navigate('Chat', {
      userId:     item.otherUser.userId,
      userName:   item.otherUser.username ?? 'User',
      userAvatar: item.otherUser.avatarUrl ?? undefined,
    });
    analytics.track('chat_opened', { source: 'list' });
  };

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
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('MainTabs' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonLoader width={52} height={52} borderRadius={26} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLoader width="60%" height={14} borderRadius={7} />
                  <SkeletonLoader width="80%" height={12} borderRadius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <AppList
            data={conversations}
            keyExtractor={(item) => item.id}
            estimatedItemSize={74}
            renderItem={({ item }) => (
              <ConversationItem
                item={item}
                currentUserId={currentUser?.id ?? ''}
                onPress={() => handleOpenChat(item)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchConversations(true); }}
                tintColor={COLORS.purple}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                description="Start a conversation by visiting someone's profile."
                actionLabel="Discover People"
                onAction={() => navigation.navigate('MainTabs')}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  skeletonWrap: { padding: SPACING.lg, gap: SPACING.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  listContent: { paddingBottom: SPACING.xl },
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.border,
  },
  onlineDot: {
    position: 'absolute', right: 1, bottom: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.background,
  },
  convContent: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convName: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600', flex: 1 },
  convNameUnread: { fontWeight: '800' },
  convTime: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginLeft: SPACING.sm },
  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convPreview: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, flex: 1 },
  convPreviewUnread: { color: COLORS.textSecondary, fontWeight: '600' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.purple, marginLeft: SPACING.sm,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 80 },
});
