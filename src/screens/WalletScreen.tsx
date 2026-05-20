import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalletStore } from '../store/walletStore';
import { walletApi, Transaction } from '../services/api';
import { CREDIT_PACKAGES } from '../utils/mockData';
import { Modal } from '../components/Modal';
import { BalanceCard, CreditPackageCard } from '../components/CreditCard';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const formatDate = (iso: string): string => {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hrs  = diff / (1000 * 60 * 60);
  if (hrs < 1)  return 'Just now';
  if (hrs < 24) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (hrs < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const txIcon = (type: string, reason: string): { name: IconName; colors: string[] } => {
  if (type === 'CREDIT') return { name: 'diamond',    colors: COLORS.gradient.gold    };
  const r = reason.toLowerCase();
  if (r.includes('chat'))  return { name: 'chatbubble', colors: COLORS.gradient.primary };
  if (r.includes('photo')) return { name: 'images',     colors: COLORS.gradient.primary };
  if (r.includes('like'))  return { name: 'heart',      colors: COLORS.gradient.primary };
  return { name: 'flash', colors: COLORS.gradient.primary };
};

export default function WalletScreen() {
  const { credits, syncBalance } = useWalletStore();

  const [history, setHistory]               = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [purchasing, setPurchasing]         = useState(false);
  const [purchasedPackage, setPurchasedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Ref-level guard prevents duplicate charges from double-taps or back-press racing
  const purchaseInFlight = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [balRes, histRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getHistory({ limit: 30 }),
      ]);
      syncBalance(balRes.data.data.balance);
      setHistory(histRes.data.data);
    } catch {
      // Keep local store value; history stays empty or retains last load
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, [syncBalance]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBuy = (pkg: typeof CREDIT_PACKAGES[0]) => {
    setPurchasedPackage(pkg);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!purchasedPackage || purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPurchasing(true);
    try {
      const res = await walletApi.addCredits({ amount: purchasedPackage.credits });
      const newBalance = res.data.data.balance;
      syncBalance(newBalance);
      setShowConfirmModal(false);

      // Reload history in background so the new transaction appears
      walletApi.getHistory({ limit: 30 })
        .then((r) => setHistory(r.data.data))
        .catch(() => {});

      Alert.alert(
        'Purchase Successful! 🎉',
        `${purchasedPackage.credits} credits added to your wallet.\nNew balance: ${newBalance} credits`,
      );
    } catch (err: any) {
      // Do NOT update balance optimistically on failure — the charge did not go through.
      const msg = err?.response?.data?.message ?? 'Purchase failed. You were not charged.';
      Alert.alert('Purchase Failed', msg);
    } finally {
      purchaseInFlight.current = false;
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.orb} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={COLORS.purple}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.pageTitle}>Wallet</Text>
              <Text style={styles.pageSubtitle}>Manage your credits</Text>
            </View>
            <View style={[styles.shieldBadge, SHADOWS.glow]}>
              <LinearGradient colors={COLORS.gradient.primary} style={styles.shieldGradient}>
                <Ionicons name="diamond" size={22} color={COLORS.white} />
              </LinearGradient>
            </View>
          </View>

          {/* Balance card — always shows live value from store */}
          <BalanceCard credits={credits} />

          {/* Usage cost hints */}
          <View style={[styles.hintCard, SHADOWS.card]}>
            <LinearGradient
              colors={['rgba(123,47,247,0.08)', 'rgba(241,7,163,0.04)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.hintItem}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.purple} />
              <Text style={styles.hintLabel}>Chat unlock</Text>
              <Text style={styles.hintCost}>20 credits</Text>
            </View>
            <View style={styles.hintDivider} />
            <View style={styles.hintItem}>
              <Ionicons name="images-outline" size={20} color={COLORS.purple} />
              <Text style={styles.hintLabel}>Photo access</Text>
              <Text style={styles.hintCost}>10 credits</Text>
            </View>
            <View style={styles.hintDivider} />
            <View style={styles.hintItem}>
              <Ionicons name="star-outline" size={20} color={COLORS.gold} />
              <Text style={styles.hintLabel}>Super like</Text>
              <Text style={styles.hintCost}>5 credits</Text>
            </View>
          </View>

          {/* Buy Credits */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Buy Credits</Text>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionBadge}
            >
              <Text style={styles.sectionBadgeText}>Best Rates</Text>
            </LinearGradient>
          </View>

          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              credits={pkg.credits}
              price={pkg.price}
              popular={pkg.popular}
              onPress={() => handleBuy(pkg)}
            />
          ))}

          {/* Transaction History */}
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>History</Text>
            {historyLoading && (
              <ActivityIndicator size="small" color={COLORS.purple} />
            )}
          </View>

          <View style={[styles.historyCard, SHADOWS.card]}>
            <LinearGradient
              colors={['rgba(123,47,247,0.06)', 'rgba(26,26,26,0)']}
              style={StyleSheet.absoluteFillObject}
            />

            {history.length === 0 && !historyLoading ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="receipt-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyHistoryText}>No transactions yet</Text>
              </View>
            ) : (
              history.map((item, i) => {
                const isCredit = item.type === 'CREDIT';
                const icon = txIcon(item.type, item.reason);
                return (
                  <View key={item.id}>
                    <View style={styles.historyRow}>
                      <View style={styles.historyIconWrapper}>
                        <LinearGradient
                          colors={icon.colors as [string, string]}
                          style={styles.historyIcon}
                        >
                          <Ionicons name={icon.name} size={18} color={COLORS.white} />
                        </LinearGradient>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyLabel} numberOfLines={1}>
                          {item.reason}
                        </Text>
                        <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.historyAmount,
                          isCredit ? styles.amountPositive : styles.amountNegative,
                        ]}
                      >
                        {isCredit ? '+' : '-'}{item.amount}
                      </Text>
                    </View>
                    {i < history.length - 1 && <View style={styles.separator} />}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>

      {/* Confirm Purchase Modal */}
      <Modal
        visible={showConfirmModal}
        onClose={() => !purchasing && setShowConfirmModal(false)}
        title="Confirm Purchase"
        description={
          purchasedPackage
            ? `You're buying ${purchasedPackage.credits} credits for ${purchasedPackage.price}.\n\nThis is a mock purchase — no real payment will be made.`
            : ''
        }
        primaryLabel={purchasing ? 'Processing...' : `Pay ${purchasedPackage?.price || ''}`}
        onPrimary={handleConfirmPurchase}
        secondaryLabel="Cancel"
        onSecondary={() => setShowConfirmModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  orb: {
    position:        'absolute',
    top:             -60,
    right:           -60,
    width:           220,
    height:          220,
    borderRadius:    110,
    backgroundColor: 'rgba(123,47,247,0.15)',
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop:        SPACING.md,
    paddingBottom:     SPACING.xxl,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.xl,
  },
  pageTitle:    { color: COLORS.text, fontSize: FONTS.sizes.xxxl, fontWeight: '800' },
  pageSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  shieldBadge:  { borderRadius: RADIUS.full, overflow: 'hidden' },
  shieldGradient: {
    width:           48,
    height:          48,
    borderRadius:    RADIUS.full,
    alignItems:      'center',
    justifyContent:  'center',
  },

  hintCard: {
    flexDirection:   'row',
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.md,
    marginBottom:    SPACING.xl,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
  },
  hintItem:    { flex: 1, alignItems: 'center', gap: 2 },
  hintLabel:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  hintCost:    { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  hintDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },

  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.md,
  },
  sectionTitle: {
    color:        COLORS.text,
    fontSize:     FONTS.sizes.lg,
    fontWeight:   '700',
    marginBottom: SPACING.md,
  },
  sectionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical:   4,
    borderRadius:      RADIUS.full,
  },
  sectionBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '700' },

  historyHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      SPACING.md,
    marginBottom:   SPACING.md,
  },

  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    overflow:        'hidden',
    minHeight:       80,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: SPACING.sm,
    gap:           SPACING.sm,
  },
  historyIconWrapper: { borderRadius: RADIUS.sm, overflow: 'hidden' },
  historyIcon: {
    width:          38,
    height:         38,
    borderRadius:   RADIUS.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },
  historyInfo:   { flex: 1 },
  historyLabel:  { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  historyDate:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  historyAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  amountPositive: { color: COLORS.success },
  amountNegative: { color: COLORS.error },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },

  emptyHistory: {
    alignItems:     'center',
    paddingVertical: SPACING.xl,
    gap:            SPACING.sm,
  },
  emptyHistoryText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});
