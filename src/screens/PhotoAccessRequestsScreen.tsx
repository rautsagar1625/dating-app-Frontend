import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Alert, RefreshControl,
} from 'react-native';
import { AppList } from '../components/AppList';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { photosApi } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { analytics } from '../services/analytics';
import { formatLastSeen } from '../utils/formatLastSeen';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const PLACEHOLDER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

type PhotoRequest = {
  id: string;
  status: string;
  createdAt: string;
  requester: {
    id: string;
    profile: { username: string } | null;
    photos: { url: string }[];
  };
};

type Props = { navigation: NativeStackNavigationProp<any, 'PhotoAccessRequests'> };

export default function PhotoAccessRequestsScreen({ navigation }: Props) {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['photo-requests'],
    queryFn:  () => photosApi.getPendingRequests().then((r) => r.data.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'GRANTED' | 'DENIED' }) =>
      photosApi.respondToRequest(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['photo-requests'] });
      const prev = qc.getQueryData<PhotoRequest[]>(['photo-requests']);
      // Optimistic: mark as resolved
      qc.setQueryData<PhotoRequest[]>(['photo-requests'], (old) =>
        old?.filter((r) => r.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['photo-requests'], ctx?.prev);
      Alert.alert('Error', 'Could not update request. Please try again.');
    },
    onSuccess: (_res, { status }) => {
      analytics.track(status === 'GRANTED' ? 'photo_access_approved' : 'photo_access_denied');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['photo-requests'] }),
  });

  const pending = data?.filter((r) => r.status === 'PENDING') ?? [];
  const count   = pending.length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0F0F0F']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Photo Requests</Text>
            {count > 0 && (
              <Text style={styles.headerSubtitle}>{count} pending request{count !== 1 ? 's' : ''}</Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonRow}>
                  <SkeletonLoader width={52} height={52} borderRadius={26} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <SkeletonLoader width="40%" height={14} borderRadius={7} />
                    <SkeletonLoader width="60%" height={11} borderRadius={6} />
                  </View>
                </View>
                <View style={styles.skeletonActions}>
                  <SkeletonLoader width="45%" height={40} borderRadius={20} />
                  <SkeletonLoader width="45%" height={40} borderRadius={20} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <AppList
            data={pending}
            keyExtractor={(item) => item.id}
            estimatedItemSize={160}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.purple}
              />
            }
            renderItem={({ item }) => {
              const isPending  = respondMutation.isPending && respondMutation.variables?.id === item.id;
              const avatarUri  = item.requester.photos?.[0]?.url ?? PLACEHOLDER_AVATAR;
              const username   = item.requester.profile?.username ?? 'User';

              return (
                <View style={styles.requestCard}>
                  {/* Profile info */}
                  <View style={styles.profileRow}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.username}>{username}</Text>
                      <Text style={styles.requestTime}>
                        Requested {formatLastSeen(item.createdAt)}
                      </Text>
                    </View>
                    {/* Preview thumbnail overlay */}
                    <View style={styles.previewWrap}>
                      <Image source={{ uri: avatarUri }} style={styles.previewThumb} blurRadius={12} />
                      <View style={styles.previewLock}>
                        <Ionicons name="lock-closed" size={14} color={COLORS.white} />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.requestNote}>
                    {username} wants to see your private photos
                  </Text>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.denyBtn, isPending && styles.btnLoading]}
                      onPress={() => respondMutation.mutate({ id: item.id, status: 'DENIED' })}
                      disabled={isPending}
                    >
                      <Ionicons name="close" size={16} color={COLORS.error} />
                      <Text style={styles.denyText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveBtn, isPending && styles.btnLoading]}
                      onPress={() => respondMutation.mutate({ id: item.id, status: 'GRANTED' })}
                      disabled={isPending}
                    >
                      <LinearGradient
                        colors={COLORS.gradient.primary}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.approveBtnGradient}
                      >
                        <Ionicons name="images" size={16} color={COLORS.white} />
                        <Text style={styles.approveText}>Share Photos</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="images-outline"
                title="No pending requests"
                description="When someone requests access to your private photos, it will appear here."
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
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  headerSubtitle: { color: COLORS.purple, fontSize: FONTS.sizes.sm, fontWeight: '600', marginTop: 1 },
  skeletonWrap: { padding: SPACING.lg, gap: SPACING.md },
  skeletonCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  skeletonActions: { flexDirection: 'row', gap: SPACING.md },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  requestCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.cardElevated },
  username: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700' },
  requestTime: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  previewWrap: { position: 'relative', width: 52, height: 52, borderRadius: RADIUS.md, overflow: 'hidden' },
  previewThumb: { width: '100%', height: '100%' },
  previewLock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  requestNote: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, marginBottom: SPACING.lg, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: SPACING.md },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.error,
    borderRadius: RADIUS.full, paddingVertical: SPACING.md,
  },
  denyText: { color: COLORS.error, fontSize: FONTS.sizes.md, fontWeight: '700' },
  approveBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  approveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.md,
  },
  approveText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
  btnLoading: { opacity: 0.5 },
});
