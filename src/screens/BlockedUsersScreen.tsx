import React, { useCallback } from 'react';
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
import { blocksApi, type BlockedUser } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { formatLastSeen } from '../utils/formatLastSeen';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const PLACEHOLDER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

type Props = { navigation: NativeStackNavigationProp<any, 'BlockedUsers'> };

export default function BlockedUsersScreen({ navigation }: Props) {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['blocks'],
    queryFn:  () => blocksApi.getBlocked().then((r) => r.data.data),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => blocksApi.unblock(userId),
    onMutate: async (userId) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['blocks'] });
      const prev = qc.getQueryData<BlockedUser[]>(['blocks']);
      qc.setQueryData<BlockedUser[]>(['blocks'], (old) => old?.filter((b) => b.user.userId !== userId) ?? []);
      return { prev };
    },
    onError: (_err, _userId, ctx) => {
      qc.setQueryData(['blocks'], ctx?.prev);
      Alert.alert('Error', 'Could not unblock user. Please try again.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  });

  const confirmUnblock = useCallback((user: BlockedUser['user']) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${user.username ?? 'this user'}? They will be able to see your profile and send you messages again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: () => unblockMutation.mutate(user.userId),
        },
      ],
    );
  }, [unblockMutation]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonLoader width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLoader width="50%" height={14} borderRadius={7} />
                  <SkeletonLoader width="70%" height={11} borderRadius={6} />
                </View>
                <SkeletonLoader width={72} height={32} borderRadius={16} />
              </View>
            ))}
          </View>
        ) : (
          <AppList
            data={data ?? []}
            keyExtractor={(item) => item.blockId}
            estimatedItemSize={68}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.purple}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Image
                  source={{ uri: item.user.avatarUrl ?? PLACEHOLDER_AVATAR }}
                  style={styles.avatar}
                />
                <View style={styles.info}>
                  <Text style={styles.username}>{item.user.username ?? 'Deleted User'}</Text>
                  <Text style={styles.blockedAt}>Blocked {formatLastSeen(item.blockedAt)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.unblockBtn,
                    unblockMutation.isPending && unblockMutation.variables === item.user.userId && styles.unblockBtnLoading,
                  ]}
                  onPress={() => confirmUnblock(item.user)}
                  disabled={unblockMutation.isPending}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <EmptyState
                icon="shield-checkmark-outline"
                title="No blocked users"
                description="Users you block will appear here."
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
  skeletonWrap: { padding: SPACING.lg, gap: SPACING.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  listContent: { paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  info: { flex: 1 },
  username: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600' },
  blockedAt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  unblockBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  unblockBtnLoading: { opacity: 0.5 },
  unblockText: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 76 },
});
