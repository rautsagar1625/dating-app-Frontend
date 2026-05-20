import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppList, type AppListRef } from '../components/AppList';
import { AppBlurView } from '../components/AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, CommonActions } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/types';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { walletApi } from '../services/api';
import { Modal } from '../components/Modal';
import { GradientButton } from '../components/GradientButton';
import { chatApi, blocksApi, Message, MessageStatus } from '../services/api';
import { getSocket, onReconnect } from '../services/socket';
import { useHaptics } from '../hooks/useHaptics';
import { formatLastSeen } from '../utils/formatLastSeen';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const PLACEHOLDER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Chat'>;
  route: RouteProp<AppStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { userId, userName, userAvatar } = route.params;
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const avatarUri = userAvatar ?? PLACEHOLDER_AVATAR;

  const { credits, syncBalance } = useWalletStore();
  const currentUser = useAuthStore((s) => s.user);

  const [chatId, setChatId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockCost, setUnlockCost] = useState(20);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [initLoading, setInitLoading] = useState(true);
  const [isBlockedState, setIsBlockedState] = useState(false);
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // P1-3: socket connection indicator
  const [socketConnected, setSocketConnected] = useState(() => {
    const s = getSocket();
    return s?.connected ?? false;
  });

  const [input, setInput] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showLowCreditsModal, setShowLowCreditsModal] = useState(false);

  // Ref-level guard — prevents double deduction even if state update hasn't flushed yet
  const unlockInFlight  = useRef(false);
  // P1-2: block button in-flight guard — mirrors the unlockInFlight pattern
  const blockInFlight   = useRef(false);

  const flatListRef    = useRef<AppListRef<Message>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending scroll timer on unmount to prevent setState-after-unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // P1-3: track socket connection status for the header indicator
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Init: create or load chat state, then fetch messages if already unlocked
  useEffect(() => {
    let cancelled = false;

    chatApi
      .startChat(userId)
      .then(async (res) => {
        if (cancelled) return;
        const { chatId: id, isUnlocked: unlocked, unlockCost: cost, otherUser } = res.data.data;
        setChatId(id);
        setIsUnlocked(unlocked);
        setUnlockCost(cost);
        setOtherUserOnline(otherUser?.isOnline ?? false);
        setOtherUserLastSeen(otherUser?.lastSeenAt ?? null);

        if (unlocked) {
          const msgRes = await chatApi.getMessages(id);
          if (!cancelled) {
            setMessages(msgRes.data.data);
            markSeenIfNeeded(msgRes.data.data, id);
          }
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          if (err?.response?.status === 403 && err?.response?.data?.message === 'BLOCKED') {
            setIsBlockedState(true);
          } else {
            setIsUnlocked(false);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setInitLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Mark received messages as seen. Accepts explicit chatId so it can be called
  // inside the init effect before the chatId state update has flushed.
  const markSeenIfNeeded = useCallback((msgs: Message[], forChatId: string) => {
    if (!currentUser) return;
    const hasUnseenFromOther = msgs.some(
      (m) => m.senderId !== currentUser.id && m.status !== 'SEEN'
    );
    if (hasUnseenFromOther) {
      chatApi.markSeen(forChatId).catch(() => {});
    }
  }, [currentUser]);

  // Real-time: append incoming messages + delivery/seen receipts + reconnect sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    const handleNewMessage = (msg: Message & { chatId: string }) => {
      if (msg.chatId !== chatId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const updated = [...prev, msg];
        markSeenIfNeeded(updated, chatId);
        return updated;
      });
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    };

    // Sender receives this when recipient comes online or opens the chat
    const handleDelivered = ({ messageIds, deliveredAt }: { messageIds: string[]; deliveredAt: string }) => {
      const ids = new Set(messageIds);
      setMessages((prev) =>
        prev.map((m) =>
          ids.has(m.id) && m.status === 'SENT'
            ? { ...m, status: 'DELIVERED' as MessageStatus, deliveredAt }
            : m
        )
      );
    };

    // Sender receives this when recipient reads the messages
    const handleSeen = ({ seenAt }: { chatId: string; seenAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUser?.id && (m.status === 'SENT' || m.status === 'DELIVERED')
            ? { ...m, status: 'SEEN' as MessageStatus, seenAt }
            : m
        )
      );
    };

    const unsubReconnect = onReconnect(`chat-${chatId}`, () => {
      chatApi.getMessages(chatId)
        .then((r) => { setMessages(r.data.data); markSeenIfNeeded(r.data.data, chatId); })
        .catch(() => {});
    });

    const handlePresence = ({ userId: changedId, online }: { userId: string; online: boolean }) => {
      if (changedId === userId) {
        setOtherUserOnline(online);
        if (online) setOtherUserLastSeen(null);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_delivered', handleDelivered);
    socket.on('messages_seen', handleSeen);
    socket.on('presence_change', handlePresence);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_delivered', handleDelivered);
      socket.off('messages_seen', handleSeen);
      socket.off('presence_change', handlePresence);
      unsubReconnect();
    };
  }, [chatId, currentUser, markSeenIfNeeded]);

  const handleUnlock = useCallback(async () => {
    // Ref guard: blocks any concurrent call regardless of render cycle timing
    if (unlockInFlight.current) return;

    // Optimistic client-side balance check — avoids a round-trip for obvious failures
    if (credits < unlockCost) {
      setShowUnlockModal(false);
      setShowLowCreditsModal(true);
      return;
    }

    if (!chatId) return;

    unlockInFlight.current = true;
    setUnlocking(true);

    try {
      const res = await chatApi.unlockChatById(chatId);
      syncBalance(res.data.data.newBalance);
      setIsUnlocked(true);
      setShowUnlockModal(false);
      haptics.success();

      const msgRes = await chatApi.getMessages(chatId);
      setMessages(msgRes.data.data);
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;

      if (status === 409) {
        // Race: another request already unlocked — treat as success, just open the chat
        setIsUnlocked(true);
        setShowUnlockModal(false);
        // Sync real balance since we don't know if we were charged
        walletApi.getBalance()
          .then((r) => syncBalance(r.data.data.balance))
          .catch(() => {});
        if (chatId) {
          chatApi.getMessages(chatId)
            .then((r) => setMessages(r.data.data))
            .catch(() => {});
        }
        return;
      }

      setShowUnlockModal(false);

      if (status === 402) {
        // Server confirmed insufficient balance — redirect to wallet
        setShowLowCreditsModal(true);
        // Sync real balance in case local store was stale
        walletApi.getBalance()
          .then((r) => syncBalance(r.data.data.balance))
          .catch(() => {});
        return;
      }

      // Unexpected error — surface it without losing the screen state
    } finally {
      unlockInFlight.current = false;
      setUnlocking(false);
    }
  }, [chatId, credits, unlockCost, syncBalance]);

  const handleSend = async () => {
    if (!input.trim() || !isUnlocked || !chatId || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);
    haptics.light();

    // clientTempId serves as both the optimistic list key and the idempotency key.
    // If the request times out and the user retries, the server deduplicates on this value.
    const clientTempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempMsg: Message = {
      id: clientTempId,
      clientTempId,
      senderId: currentUser?.id ?? 'me',
      message: text,
      status: 'SENDING',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const res = await chatApi.sendMessage(chatId, text, clientTempId);
      setMessages((prev) => prev.map((m) => (m.id === clientTempId ? res.data.data : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === clientTempId ? { ...m, status: 'FAILED' as MessageStatus } : m))
      );
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleBlock = () => {
    // P1-2: guard against double-tap firing two API calls
    if (blockInFlight.current) return;
    Alert.alert(
      'Block User',
      `${userName} won't be able to see you, and you won't see them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (blockInFlight.current) return;
            blockInFlight.current = true;
            try {
              await blocksApi.block(userId);
            } catch {
              // 409 already-blocked is fine — still navigate away
            } finally {
              blockInFlight.current = false;
            }
            navigation.goBack();
          },
        },
      ],
    );
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?.id;
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    let statusIcon: React.ReactNode = null;
    if (isMe) {
      switch (item.status) {
        case 'SENDING':
          statusIcon = <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.4)" />;
          break;
        case 'FAILED':
          statusIcon = <Ionicons name="alert-circle-outline" size={11} color={COLORS.error} />;
          break;
        case 'SENT':
          statusIcon = <Ionicons name="checkmark-outline" size={11} color="rgba(255,255,255,0.5)" />;
          break;
        case 'DELIVERED':
          statusIcon = <Ionicons name="checkmark-done-outline" size={11} color="rgba(255,255,255,0.5)" />;
          break;
        case 'SEEN':
          statusIcon = <Ionicons name="checkmark-done-outline" size={11} color={COLORS.purple} />;
          break;
      }
    }

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />}
        {isMe ? (
          <LinearGradient
            colors={item.status === 'FAILED' ? ['#3a1a1a', '#2a0f0f'] : COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.bubble, styles.bubbleMe]}
          >
            <Text style={styles.bubbleTextMe}>{item.message}</Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampMe}>{time}</Text>
              {statusIcon}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleThem]}>
            <Text style={styles.bubbleText}>{item.message}</Text>
            <Text style={styles.timestamp}>{time}</Text>
          </View>
        )}
      </View>
    );
  }, [currentUser?.id, avatarUri]);

  if (initLoading) {
    return (
      <View style={[styles.root, styles.centerState]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1A0A2E', '#0F0F0F']}
          locations={[0, 0.5]}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Opening chat...</Text>
      </View>
    );
  }

  if (isBlockedState) {
    return (
      <View style={[styles.root, styles.centerState]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1A0A2E', '#0F0F0F']}
          locations={[0, 0.5]}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity style={[styles.backBtnAbs, { top: insets.top + 12 }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <AppBlurView intensity={30} tint="dark" style={styles.backCircle}>
            <Ionicons name="arrow-back" size={18} color={COLORS.white} />
          </AppBlurView>
        </TouchableOpacity>
        <View style={styles.blockedIconWrap}>
          <Ionicons name="ban" size={48} color={COLORS.error} />
        </View>
        <Text style={styles.blockedTitle}>Unavailable</Text>
        <Text style={styles.loadingText}>This conversation is no longer available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.5]}
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
            <AppBlurView intensity={30} tint="dark" style={styles.backCircle}>
              <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            </AppBlurView>
          </TouchableOpacity>

          <View style={styles.headerUser}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              {otherUserOnline && <View style={styles.avatarDot} />}
            </View>
            <View>
              <Text style={styles.headerName}>{userName}</Text>
              <Text style={[styles.headerStatus, otherUserOnline && styles.headerStatusOnline]}>
                {otherUserLastSeen
                  ? formatLastSeen(otherUserLastSeen)
                  : isUnlocked ? 'Chat unlocked' : 'Tap to unlock'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <LinearGradient
              colors={['rgba(245,200,66,0.15)', 'rgba(245,200,66,0.08)']}
              style={styles.creditBadge}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="diamond" size={13} color={COLORS.gold} />
                <Text style={styles.creditBadgeText}>{credits}</Text>
              </View>
            </LinearGradient>
            {/* P1-3: socket connection indicator — only visible when disconnected */}
            {!socketConnected && (
              <View style={styles.socketIndicator}>
                <View style={styles.socketDotOrange} />
              </View>
            )}
            <TouchableOpacity onPress={handleBlock} style={styles.moreBtn} activeOpacity={0.8}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* ── LOCKED STATE ── */}
          {!isUnlocked ? (
            <View style={styles.lockedContainer}>
              {/* Pulsing vault orb */}
              <View style={[styles.vaultWrapper, SHADOWS.glow]}>
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.vaultGradient}
                >
                  <Ionicons name="lock-closed" size={46} color={COLORS.white} />
                </LinearGradient>
              </View>

              <Text style={styles.lockedTitle}>Chat is Locked</Text>
              <Text style={styles.lockedDesc}>
                Unlock a private conversation with{'\n'}
                <Text style={styles.lockedName}>{userName}</Text>
              </Text>

              {/* Cost card */}
              <View style={[styles.costCard, SHADOWS.glowGold]}>
                <LinearGradient
                  colors={['rgba(245,200,66,0.15)', 'rgba(245,200,66,0.04)']}
                  style={styles.costCardGradient}
                >
                  <Text style={styles.costLabel}>UNLOCK COST</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="diamond" size={22} color={COLORS.gold} />
                    <Text style={styles.costValue}>{unlockCost} credits</Text>
                  </View>
                  <Text style={styles.costBalance}>Your balance: {credits} credits</Text>
                  {credits < unlockCost && (
                    <View style={styles.insufficientBadge}>
                      <Ionicons name="warning-outline" size={12} color={COLORS.error} />
                      <Text style={styles.insufficientText}>Insufficient credits</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              <GradientButton
                label={
                  credits < unlockCost
                    ? 'Buy Credits'
                    : `Unlock Chat — ${unlockCost} Credits`
                }
                onPress={() =>
                  credits < unlockCost
                    ? setShowLowCreditsModal(true)
                    : setShowUnlockModal(true)
                }
                size="lg"
                style={styles.unlockBtn}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                <Text style={styles.vaultHint}>Messages are end-to-end encrypted</Text>
              </View>
            </View>
          ) : (
            /* ── UNLOCKED STATE ── */
            <>
              <View style={styles.unlockedBanner}>
                <LinearGradient
                  colors={['rgba(48,209,88,0.12)', 'rgba(48,209,88,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.unlockedBannerGradient}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="lock-open" size={13} color={COLORS.success} />
                    <Text style={styles.unlockedBannerText}>
                      Chat unlocked — messages are private
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              <AppList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <LinearGradient
                      colors={COLORS.gradient.primary}
                      style={styles.emptyChatIcon}
                    >
                      <Ionicons name="chatbubbles" size={32} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.emptyChatTitle}>Say hello!</Text>
                    <Text style={styles.emptyChatSubtitle}>
                      Start a conversation with {userName}
                    </Text>
                  </View>
                }
              />

              {/* Input bar — P1-4: paddingBottom respects iPhone home indicator */}
              <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={`Message ${userName}...`}
                    placeholderTextColor={COLORS.textMuted}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    onSubmitEditing={handleSend}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || sending}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      input.trim() && !sending
                        ? COLORS.gradient.primary
                        : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendBtn}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="send" size={18} color={COLORS.white} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Unlock confirmation modal — close/cancel blocked while request is in flight */}
      <Modal
        visible={showUnlockModal}
        onClose={() => { if (!unlocking) setShowUnlockModal(false); }}
        title="Unlock Chat"
        description={`Start a private conversation with ${userName} for just ${unlockCost} credits.\n\nYour balance: ${credits} credits`}
        primaryLabel={unlocking ? 'Unlocking...' : `Unlock — ${unlockCost} Credits`}
        onPrimary={handleUnlock}
        secondaryLabel="Maybe later"
        onSecondary={() => { if (!unlocking) setShowUnlockModal(false); }}
      />

      {/* Low credits modal — P1-1: safe navigation that works from any nav context */}
      <Modal
        visible={showLowCreditsModal}
        onClose={() => setShowLowCreditsModal(false)}
        title="Not Enough Credits"
        description={`You need ${unlockCost} credits but only have ${credits}.\n\nTop up your wallet to unlock this conversation.`}
        primaryLabel="Buy Credits"
        onPrimary={() => {
          setShowLowCreditsModal(false);
          // Safe navigation: dispatch a reset action rather than assuming parent structure.
          // This works whether the screen was opened from the tab bar, a deep-link,
          // or a push notification — it won't crash if the parent nav differs.
          navigation.dispatch(
            CommonActions.navigate({ name: 'Wallet' })
          );
        }}
        secondaryLabel="Cancel"
        onSecondary={() => setShowLowCreditsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  centerState: { alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  backBtnAbs: { position: 'absolute', left: SPACING.lg, borderRadius: RADIUS.full, overflow: 'hidden' },
  blockedIconWrap: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,69,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: RADIUS.full },
  avatarDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  headerName: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700' },
  headerStatus: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  headerStatusOnline: { color: COLORS.success },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  moreBtn: { padding: 4 },
  creditBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  creditBadgeText: { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  // P1-3: socket indicator — shown only when disconnected
  socketIndicator: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,149,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  socketDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },


  // Locked state
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  vaultWrapper: { borderRadius: RADIUS.full },
  vaultGradient: {
    width: 110,
    height: 110,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  lockedDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  lockedName: { color: COLORS.pink, fontWeight: '700' },
  costCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  costCardGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  costLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  costValue: {
    color: COLORS.gold,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
  },
  costBalance: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  insufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  insufficientText: { color: COLORS.error, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  unlockBtn: { width: '100%' },
  vaultHint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  // Unlocked
  unlockedBanner: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: 2,
  },
  unlockedBannerGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  unlockedBannerText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '600' },

  // Messages
  messageList: { padding: SPACING.md, paddingBottom: SPACING.sm, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: RADIUS.full, marginRight: SPACING.xs },
  bubble: {
    maxWidth: '72%',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, lineHeight: 20 },
  bubbleTextMe: { color: COLORS.white, fontSize: FONTS.sizes.md, lineHeight: 20 },
  timestamp: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4, textAlign: 'right' },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 4,
  },
  timestampMe: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FONTS.sizes.xs,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xxl * 2,
    gap: SPACING.sm,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '700' },
  emptyChatSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
  },
  textInput: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    minHeight: 24,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
