import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { subscriptionsApi, type SubscriptionPlan, type SubscriptionPlanId } from '../services/api';
import { analytics } from '../services/analytics';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<any, 'Subscription'> };
type Interval = 'monthly' | 'yearly';

const PLAN_ICONS: Record<SubscriptionPlanId, string> = {
  velvet_basic: '⭐',
  velvet_plus:  '💜',
  velvet_gold:  '👑',
};

const PLAN_COLORS: Record<SubscriptionPlanId, [string, string]> = {
  velvet_basic: ['#5A3A9A', '#3D2070'],
  velvet_plus:  ['#7B2FF7', '#F107A3'],
  velvet_gold:  ['#F5C842', '#C9A020'],
};

export default function SubscriptionScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const [interval, setInterval] = useState<Interval>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId | null>(null);
  // P1-5: prevent double-tap on restore
  const [restoreLoading, setRestoreLoading] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey:  ['subscription', 'plans'],
    queryFn:   () => subscriptionsApi.getPlans().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  const { data: current, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription', 'status'],
    queryFn:  () => subscriptionsApi.getStatus().then((r) => r.data.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: SubscriptionPlanId) =>
      subscriptionsApi.createCheckout({ planId, interval, platform: 'stripe' }),
    onSuccess: async (res) => {
      const { checkoutUrl } = res.data.data;
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (canOpen) {
        analytics.track('subscription_started', { plan: selectedPlan, interval });
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Error', 'Could not open checkout. Please try again.');
      }
    },
    onError: () => {
      Alert.alert('Checkout Failed', 'Could not start checkout. Please try again.');
      analytics.track('subscription_failed', { plan: selectedPlan });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionsApi.cancel(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription', 'status'] });
      analytics.track('subscription_cancelled', { plan: current?.planId });
      Alert.alert('Subscription Cancelled', 'Your subscription will remain active until the end of the billing period.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel subscription. Please contact support.'),
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (current?.planId === plan.id && current.status === 'active') return;
    setSelectedPlan(plan.id);
    analytics.track('subscription_view', { plan: plan.id });
    checkoutMutation.mutate(plan.id);
  };

  const yearlyDiscount = (monthly: number, yearly: number) =>
    Math.round((1 - yearly / (monthly * 12)) * 100);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>Unlock the Full{'\n'}Velvet Experience</Text>
            <Text style={styles.heroSubtitle}>
              Go premium and connect with more people, see who likes you, and stand out.
            </Text>
          </View>

          {/* Interval toggle */}
          <View style={styles.intervalRow}>
            {(['monthly', 'yearly'] as Interval[]).map((iv) => (
              <TouchableOpacity
                key={iv}
                style={[styles.intervalBtn, interval === iv && styles.intervalBtnActive]}
                onPress={() => setInterval(iv)}
              >
                {interval === iv && (
                  <LinearGradient
                    colors={COLORS.gradient.primary}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <Text style={[styles.intervalText, interval === iv && styles.intervalTextActive]}>
                  {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {iv === 'yearly' && plans?.[1] && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      -{yearlyDiscount(plans[1].priceMonthly, plans[1].priceYearly)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Plans */}
          {plansLoading ? (
            <View style={styles.loadingPlans}>
              <ActivityIndicator color={COLORS.purple} size="large" />
            </View>
          ) : (
            <View style={styles.plansGrid}>
              {plans?.map((plan) => {
                const price      = interval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                const isActive   = current?.planId === plan.id && current.status === 'active';
                const isSelected = selectedPlan === plan.id;
                const colors     = PLAN_COLORS[plan.id] ?? COLORS.gradient.primary;

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      plan.highlighted && styles.planCardHighlighted,
                      isActive && styles.planCardActive,
                    ]}
                    onPress={() => handleSelectPlan(plan)}
                    disabled={checkoutMutation.isPending || isActive}
                    activeOpacity={0.85}
                  >
                    {plan.highlighted && (
                      <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.planHighlightBorder}
                      />
                    )}
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Current Plan</Text>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <Text style={styles.planEmoji}>{PLAN_ICONS[plan.id]}</Text>
                      <View>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <View style={styles.planPriceRow}>
                          <Text style={styles.planPrice}>${(price / 100).toFixed(2)}</Text>
                          <Text style={styles.planPricePer}>/{interval === 'monthly' ? 'mo' : 'yr'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.planDivider} />

                    {plan.features.map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors[0]} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}

                    {!isActive && (
                      <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.planCta, checkoutMutation.isPending && isSelected && styles.planCtaLoading]}
                      >
                        {checkoutMutation.isPending && isSelected
                          ? <ActivityIndicator color={COLORS.white} size="small" />
                          : <Text style={styles.planCtaText}>Get {plan.name}</Text>}
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Active subscription management */}
          {current && !statusLoading && (
            <View style={styles.manageSub}>
              <Text style={styles.manageTitle}>Active Subscription</Text>
              <Text style={styles.manageDetail}>
                {current.planName} · Renews {new Date(current.currentPeriodEnd).toLocaleDateString()}
              </Text>
              {!current.cancelAtPeriodEnd && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Subscription',
                      'Your access will continue until the end of the current billing period.',
                      [
                        { text: 'Keep Subscription', style: 'cancel' },
                        { text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
                      ],
                    );
                  }}
                  disabled={cancelMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Subscription'}
                  </Text>
                </TouchableOpacity>
              )}
              {current.cancelAtPeriodEnd && (
                <Text style={styles.cancelScheduled}>
                  Cancels on {new Date(current.currentPeriodEnd).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}

          {/* Restore */}
          <TouchableOpacity
            style={[styles.restoreBtn, restoreLoading && styles.restoreBtnDisabled]}
            disabled={restoreLoading}
            onPress={async () => {
              if (restoreLoading) return;
              setRestoreLoading(true);
              try {
                await subscriptionsApi.restore();
                qc.invalidateQueries({ queryKey: ['subscription'] });
                Alert.alert('Purchases Restored', 'Your subscription has been restored.');
              } catch {
                Alert.alert('Restore Failed', 'No purchases found to restore.');
              } finally {
                setRestoreLoading(false);
              }
            }}
          >
            {restoreLoading ? (
              <ActivityIndicator size="small" color={COLORS.purple} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Subscriptions auto-renew unless cancelled 24h before the end of the period. Manage in App Store / Play Store settings.
          </Text>
        </ScrollView>
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
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  scroll: { paddingBottom: SPACING.xxl },
  hero: { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xl },
  heroEmoji: { fontSize: 48, marginBottom: SPACING.md },
  heroTitle: { color: COLORS.text, fontSize: FONTS.sizes.xxxl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  heroSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, textAlign: 'center', lineHeight: 22 },
  intervalRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  intervalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, gap: SPACING.xs, overflow: 'hidden',
  },
  intervalBtnActive: {},
  intervalText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, fontWeight: '600' },
  intervalTextActive: { color: COLORS.white, fontWeight: '700' },
  discountBadge: {
    backgroundColor: COLORS.success, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xs, paddingVertical: 2,
  },
  discountText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '800' },
  loadingPlans: { height: 200, alignItems: 'center', justifyContent: 'center' },
  plansGrid: { gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  planCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  planCardHighlighted: { borderColor: COLORS.purple },
  planCardActive: { borderColor: COLORS.success },
  planHighlightBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
  },
  activeBadge: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    backgroundColor: 'rgba(48,209,88,0.15)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.success,
  },
  activeBadgeText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  planEmoji: { fontSize: 32 },
  planName: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  planPricePer: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  planDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  featureText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, flex: 1 },
  planCta: {
    borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, marginTop: SPACING.md, minHeight: 48,
  },
  planCtaLoading: { opacity: 0.7 },
  planCtaText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
  manageSub: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  manageTitle: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700', marginBottom: SPACING.xs },
  manageDetail: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginBottom: SPACING.md },
  cancelBtn: {
    borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm, alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  cancelScheduled: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.md, minHeight: 44 },
  restoreBtnDisabled: { opacity: 0.5 },
  restoreText: { color: COLORS.purple, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  legalText: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs,
    textAlign: 'center', lineHeight: 17,
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg,
  },
});
