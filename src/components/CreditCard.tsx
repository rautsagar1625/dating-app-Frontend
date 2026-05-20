import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';

interface CreditPackageCardProps {
  credits: number;
  price: string;
  popular?: boolean;
  onPress: () => void;
}

export function CreditPackageCard({ credits, price, popular = false, onPress }: CreditPackageCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      {popular ? (
        <LinearGradient
          colors={COLORS.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.border, SHADOWS.glow]}
        >
          <View style={styles.inner}>
            <View style={styles.popularBadge}>
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.popularBadgeGradient}
              >
                <Text style={styles.popularText}>BEST VALUE</Text>
              </LinearGradient>
            </View>
            <View style={styles.row}>
              <Ionicons name="diamond" size={20} color={COLORS.gold} />
              <Text style={styles.creditsGold}> {credits}</Text>
              <Text style={styles.creditsLabel}> Credits</Text>
            </View>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.perCredit}>
              {(parseFloat(price.replace(/[^0-9.]/g, '')) / credits).toFixed(2)}₹/credit
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={['rgba(123,47,247,0.3)', 'rgba(241,7,163,0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.border}
        >
          <View style={styles.inner}>
            <View style={styles.row}>
              <Ionicons name="diamond" size={20} color={COLORS.white} />
              <Text style={styles.credits}> {credits}</Text>
              <Text style={styles.creditsLabel}> Credits</Text>
            </View>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.perCredit}>
              {(parseFloat(price.replace(/[^0-9.]/g, '')) / credits).toFixed(2)}₹/credit
            </Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

interface BalanceCardProps {
  credits: number;
}

export function BalanceCard({ credits }: BalanceCardProps) {
  return (
    <LinearGradient
      colors={COLORS.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.balanceCard, SHADOWS.glow]}
    >
      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          <View style={styles.balanceAmountRow}>
            <Ionicons name="diamond" size={24} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={styles.balanceAmount}>{credits}</Text>
            <Text style={styles.balanceCurrency}> credits</Text>
          </View>
        </View>
        <View style={styles.balanceIcon}>
          <Ionicons name="diamond" size={28} color={COLORS.white} />
        </View>
      </View>
      <Text style={styles.balanceHint}>Use credits to unlock chats & private photos</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  border: {
    padding: 1.5,
    borderRadius: RADIUS.xl,
  },
  inner: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl - 1.5,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  popularBadgeGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  popularText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  credits: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  creditsGold: {
    color: COLORS.gold,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  creditsLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
  },
  price: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
  },
  perCredit: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  balanceCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.glow,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: FONTS.sizes.hero,
    fontWeight: '800',
  },
  balanceCurrency: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONTS.sizes.sm,
  },
});
