import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { AppList } from '../components/AppList';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../services/toast';
import { giftsApi, type ReceivedGift, type GiftCatalogItem } from '../services/api';
import { useWalletStore } from '../store/walletStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { formatLastSeen } from '../utils/formatLastSeen';

const PLACEHOLDER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

// ── Gift picker modal ────────────────────────────────────────────────────────

interface GiftPickerProps {
  visible:    boolean;
  receiverId: string;
  onClose:    () => void;
  onSent:     () => void;
}

export function GiftPickerModal({ visible, receiverId, onClose, onSent }: GiftPickerProps) {
  const [catalog,  setCatalog]  = useState<GiftCatalogItem[]>([]);
  const [selected, setSelected] = useState<GiftCatalogItem | null>(null);
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const credits = useWalletStore((s) => s.credits);

  React.useEffect(() => {
    if (!visible) return;
    setLoading(true);
    giftsApi.getCatalog()
      .then((r) => { setCatalog(r.data.data ?? []); setSelected(null); setMessage(''); })
      .catch(() => toast.show('Could not load gift catalog', 'error'))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSend = async () => {
    if (!selected) return;
    if (credits < selected.cost) {
      Alert.alert('Not enough credits', `You need ${selected.cost} credits to send this gift. You have ${credits}.`);
      return;
    }
    setSending(true);
    try {
      await giftsApi.send({ receiverId, giftId: selected.id, message: message.trim() || undefined });
      toast.show(`${selected.emoji} Gift sent!`, 'success');
      onSent();
      onClose();
    } catch (e: any) {
      toast.show(e.response?.data?.message ?? 'Could not send gift', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Send a Gift</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Credits */}
          <View style={pickerStyles.creditRow}>
            <Ionicons name="diamond" size={14} color={COLORS.gold} />
            <Text style={pickerStyles.creditText}>{credits} credits</Text>
          </View>

          {/* Gift grid */}
          {loading ? (
            <View style={pickerStyles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonLoader key={i} width={80} height={90} borderRadius={RADIUS.lg} />
              ))}
            </View>
          ) : (
            <View style={pickerStyles.grid}>
              {catalog.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[pickerStyles.giftItem, selected?.id === item.id && pickerStyles.giftItemActive]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.8}
                >
                  <Text style={pickerStyles.giftEmoji}>{item.emoji}</Text>
                  <Text style={pickerStyles.giftName}>{item.name}</Text>
                  <View style={pickerStyles.giftCost}>
                    <Ionicons name="diamond" size={9} color={COLORS.gold} />
                    <Text style={pickerStyles.giftCostText}>{item.cost}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Message */}
          <TextInput
            style={pickerStyles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Add a message (optional)…"
            placeholderTextColor={COLORS.textMuted}
            maxLength={200}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[pickerStyles.sendBtn, (!selected || sending) && pickerStyles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selected || sending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={pickerStyles.sendBtnGrad}
            >
              <Text style={pickerStyles.sendBtnText}>
                {sending ? 'Sending…' : selected ? `Send ${selected.emoji} for ${selected.cost} credits` : 'Select a gift'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:      { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  creditRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  creditText: { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, padding: SPACING.lg },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  giftItem: {
    width: 80, alignItems: 'center', gap: 4,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  giftItemActive: { borderColor: COLORS.purple, backgroundColor: 'rgba(123,47,247,0.15)' },
  giftEmoji:   { fontSize: 30 },
  giftName:    { color: COLORS.text, fontSize: FONTS.sizes.xs, fontWeight: '600', textAlign: 'center' },
  giftCost:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  giftCostText: { color: COLORS.gold, fontSize: 9, fontWeight: '700' },
  messageInput: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm, color: COLORS.text, fontSize: FONTS.sizes.sm,
  },
  sendBtn: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.full, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGrad: { paddingVertical: SPACING.md, alignItems: 'center' },
  sendBtnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '800' },
});

// ── Received gifts screen ────────────────────────────────────────────────────

function GiftRow({ gift, index }: { gift: ReceivedGift; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(280)} style={styles.giftRow}>
      <Animated.Image
        source={{ uri: gift.sender.avatarUrl ?? PLACEHOLDER_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.giftContent}>
        <View style={styles.giftTop}>
          <Text style={styles.senderName}>{gift.sender.username}</Text>
          <Text style={styles.giftTime}>{formatLastSeen(gift.createdAt)}</Text>
        </View>
        <View style={styles.giftBubble}>
          <Text style={styles.giftEmoji}>{gift.giftEmoji}</Text>
          <Text style={styles.giftName}>{gift.giftName}</Text>
          <View style={styles.costBadge}>
            <Ionicons name="diamond" size={9} color={COLORS.gold} />
            <Text style={styles.costText}>{gift.giftCost}</Text>
          </View>
        </View>
        {gift.message ? (
          <Text style={styles.giftMessage}>"{gift.message}"</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function GiftsScreen() {
  const [gifts,     setGifts]     = useState<ReceivedGift[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await giftsApi.getReceived();
      setGifts(res.data.data ?? []);
    } catch {
      toast.show('Could not load gifts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gifts</Text>
          <Text style={styles.headerSub}>{gifts.length} gifts received</Text>
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: SPACING.md, alignItems: 'center' }}>
                <SkeletonLoader width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLoader width="40%" height={12} borderRadius={6} />
                  <SkeletonLoader width="70%" height={14} borderRadius={7} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <AppList
            data={gifts}
            keyExtractor={(item) => item.id}
            estimatedItemSize={80}
            renderItem={({ item, index }) => <GiftRow gift={item} index={index} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(true); }}
                tintColor={COLORS.purple}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="gift-outline"
                title="No gifts yet"
                description="When someone sends you a gift, it appears here."
              />
            }
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  headerSub:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  skeletonWrap: { padding: SPACING.lg, gap: SPACING.lg },
  listContent:  { paddingBottom: SPACING.xl },

  giftRow: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.border,
  },
  giftContent: { flex: 1 },
  giftTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  senderName: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  giftTime:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  giftBubble: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm, paddingVertical: 6,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border,
  },
  giftEmoji: { fontSize: 22 },
  giftName:  { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  costBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  costText:  { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  giftMessage: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontStyle: 'italic', marginTop: 4,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 76 },
});
