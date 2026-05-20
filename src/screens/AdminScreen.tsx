import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/types';
import { adminApi, AdminUser, AdminReport } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

type Props = { navigation: NativeStackNavigationProp<AppStackParamList, 'Admin'> };

type Tab = 'users' | 'reports';

function initials(user: AdminUser): string {
  const name = user.profile?.username ?? user.email ?? '?';
  return name.replace('@', '').slice(0, 2).toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m}mo ago`;
}

// ── User card ────────────────────────────────────────────────────────────────

interface UserCardProps {
  user: AdminUser;
  onBan: (id: string, ban: boolean) => void;
  banning: boolean;
}

function UserCard({ user, onBan, banning }: UserCardProps) {
  const isAdmin = user.role === 'admin';
  const name = user.profile?.username ?? user.email ?? user.phone ?? user.id.slice(0, 8);

  return (
    <View style={cardStyles.root}>
      <View style={cardStyles.avatar}>
        <LinearGradient
          colors={user.isBanned ? ['#636366', '#3A3A3C'] : COLORS.gradient.primary}
          style={cardStyles.avatarGradient}
        >
          <Text style={cardStyles.avatarText}>{initials(user)}</Text>
        </LinearGradient>
      </View>

      <View style={cardStyles.body}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name} numberOfLines={1}>{name}</Text>
          {isAdmin && (
            <View style={cardStyles.adminBadge}>
              <Text style={cardStyles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
          {user.isBanned && (
            <View style={cardStyles.bannedBadge}>
              <Text style={cardStyles.bannedBadgeText}>BANNED</Text>
            </View>
          )}
          {user.reportCount > 0 && (
            <View style={cardStyles.reportBadge}>
              <Ionicons name="flag" size={9} color={COLORS.white} />
              <Text style={cardStyles.reportBadgeText}>{user.reportCount}</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.meta} numberOfLines={1}>
          {user.email ?? user.phone ?? 'No contact'} · Joined {timeAgo(user.createdAt)}
        </Text>
        {user.profile?.location && (
          <Text style={cardStyles.location} numberOfLines={1}>{user.profile.location}</Text>
        )}
      </View>

      {!isAdmin && (
        <TouchableOpacity
          style={[cardStyles.banBtn, user.isBanned ? cardStyles.unbanBtn : cardStyles.doBanBtn]}
          onPress={() => onBan(user.id, !user.isBanned)}
          disabled={banning}
          activeOpacity={0.75}
        >
          {banning ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={cardStyles.banBtnText}>{user.isBanned ? 'Unban' : 'Ban'}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: { borderRadius: RADIUS.full, overflow: 'hidden' },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '700' },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  name: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '600', flexShrink: 1 },
  adminBadge: {
    backgroundColor: 'rgba(245,200,66,0.2)',
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  adminBadgeText: { color: COLORS.gold, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  bannedBadge: {
    backgroundColor: 'rgba(255,69,58,0.2)',
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  bannedBadgeText: { color: COLORS.error, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(241,7,163,0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.pink,
  },
  reportBadgeText: { color: COLORS.pink, fontSize: 9, fontWeight: '800' },
  meta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  location: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  banBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doBanBtn: { backgroundColor: 'rgba(255,69,58,0.15)', borderWidth: 1, borderColor: COLORS.error },
  unbanBtn: { backgroundColor: 'rgba(48,209,88,0.15)', borderWidth: 1, borderColor: COLORS.success },
  banBtnText: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});

// ── Report card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: AdminReport;
  onResolve: (id: string) => void;
  resolving: boolean;
}

function ReportCard({ report, onResolve, resolving }: ReportCardProps) {
  const reporterName = report.reporter.profile?.username ?? report.reporter.email ?? 'Unknown';
  const reportedName = report.reported.profile?.username ?? report.reported.email ?? 'Unknown';

  return (
    <View style={rCardStyles.root}>
      <View style={rCardStyles.header}>
        <View style={rCardStyles.users}>
          <Text style={rCardStyles.userName}>{reporterName}</Text>
          <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
          <Text style={[rCardStyles.userName, { color: report.reported.isBanned ? COLORS.error : COLORS.text }]}>
            {reportedName}
          </Text>
          {report.reported.isBanned && (
            <View style={rCardStyles.bannedMini}>
              <Text style={rCardStyles.bannedMiniText}>BANNED</Text>
            </View>
          )}
        </View>
        <Text style={rCardStyles.date}>{timeAgo(report.createdAt)}</Text>
      </View>

      <View style={rCardStyles.reasonRow}>
        <Ionicons name="flag-outline" size={13} color={COLORS.pink} />
        <Text style={rCardStyles.reason} numberOfLines={2}>{report.reason}</Text>
      </View>

      <View style={rCardStyles.footer}>
        {report.isResolved ? (
          <View style={rCardStyles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={rCardStyles.resolvedText}>Resolved</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={rCardStyles.resolveBtn}
            onPress={() => onResolve(report.id)}
            disabled={resolving}
            activeOpacity={0.75}
          >
            {resolving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={13} color={COLORS.white} />
                <Text style={rCardStyles.resolveBtnText}>Resolve</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const rCardStyles = StyleSheet.create({
  root: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  users: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  userName: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  bannedMini: {
    backgroundColor: 'rgba(255,69,58,0.2)',
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  bannedMiniText: { color: COLORS.error, fontSize: 8, fontWeight: '800' },
  date: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  reasonRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  reason: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resolvedText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.purple,
    minWidth: 90,
    justifyContent: 'center',
  },
  resolveBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});

// ── Main screen ──────────────────────────────────────────────────────────────

export default function AdminScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('users');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBanned, setFilterBanned] = useState<boolean | undefined>(undefined);
  const [banningId, setBanningId] = useState<string | null>(null);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsRefreshing, setReportsRefreshing] = useState(false);
  const [filterResolved, setFilterResolved] = useState<boolean | undefined>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadUsers = useCallback(async (refresh = false) => {
    if (refresh) setUsersRefreshing(true);
    else setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: search || undefined,
        banned: filterBanned,
      });
      setUsers(res.data.data);
      setUsersTotal(res.data.meta.total);
    } catch {
      Alert.alert('Error', 'Could not load users.');
    } finally {
      setUsersLoading(false);
      setUsersRefreshing(false);
    }
  }, [search, filterBanned]);

  const loadReports = useCallback(async (refresh = false) => {
    if (refresh) setReportsRefreshing(true);
    else setReportsLoading(true);
    try {
      const res = await adminApi.getReports({ resolved: filterResolved });
      setReports(res.data.data);
      setReportsTotal(res.data.meta.total);
    } catch {
      Alert.alert('Error', 'Could not load reports.');
    } finally {
      setReportsLoading(false);
      setReportsRefreshing(false);
    }
  }, [filterResolved]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadReports(); }, [loadReports]);

  const handleBan = (userId: string, isBanned: boolean) => {
    const action = isBanned ? 'Ban' : 'Unban';
    Alert.alert(
      `${action} user?`,
      isBanned ? 'This user will lose access immediately.' : 'This will restore their access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: isBanned ? 'destructive' : 'default',
          onPress: async () => {
            setBanningId(userId);
            try {
              await adminApi.banUser(userId, isBanned);
              setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, isBanned } : u))
              );
            } catch {
              Alert.alert('Error', 'Could not update ban status.');
            } finally {
              setBanningId(null);
            }
          },
        },
      ],
    );
  };

  const handleResolve = async (reportId: string) => {
    setResolvingId(reportId);
    try {
      await adminApi.resolveReport(reportId);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, isResolved: true } : r))
      );
    } catch {
      Alert.alert('Error', 'Could not resolve report.');
    } finally {
      setResolvingId(null);
    }
  };

  const pendingReportCount = reports.filter((r) => !r.isResolved).length;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={COLORS.gradient.primary} style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{usersTotal}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: COLORS.error }]}>
            {users.filter((u) => u.isBanned).length}
          </Text>
          <Text style={styles.statLabel}>Banned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: COLORS.pink }]}>{pendingReportCount}</Text>
          <Text style={styles.statLabel}>Pending Reports</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['users', 'reports'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={styles.tabBtn}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            {tab === t ? (
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabActive}
              >
                <Text style={styles.tabTextActive}>
                  {t === 'users' ? `Users (${usersTotal})` : `Reports (${reportsTotal})`}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInactive}>
                <Text style={styles.tabText}>
                  {t === 'users' ? `Users (${usersTotal})` : `Reports (${reportsTotal})`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <View style={styles.content}>
          {/* Search + filter row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search username or email..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={() => loadUsers()}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterChip, filterBanned === true && styles.filterChipActive]}
              onPress={() => setFilterBanned(filterBanned === true ? undefined : true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, filterBanned === true && styles.filterChipTextActive]}>
                Banned
              </Text>
            </TouchableOpacity>
          </View>

          {usersLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.purple} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={usersRefreshing}
                  onRefresh={() => loadUsers(true)}
                  tintColor={COLORS.purple}
                />
              }
            >
              <View style={styles.listCard}>
                {users.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    onBan={handleBan}
                    banning={banningId === u.id}
                  />
                ))}
              </View>
              <View style={{ height: SPACING.xxl }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Reports tab ── */}
      {tab === 'reports' && (
        <View style={styles.content}>
          {/* Filter chips */}
          <View style={styles.filterRow}>
            {[
              { label: 'Pending', value: false },
              { label: 'Resolved', value: true },
              { label: 'All', value: undefined },
            ].map(({ label, value }) => (
              <TouchableOpacity
                key={label}
                style={[styles.filterChip, filterResolved === value && styles.filterChipActive]}
                onPress={() => setFilterResolved(value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, filterResolved === value && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {reportsLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.purple} />
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No reports found</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={reportsRefreshing}
                  onRefresh={() => loadReports(true)}
                  tintColor={COLORS.purple}
                />
              }
            >
              <View style={styles.listCard}>
                {reports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onResolve={handleResolve}
                    resolving={resolvingId === r.id}
                  />
                ))}
              </View>
              <View style={{ height: SPACING.xxl }} />
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, width: 36 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  tabActive: { paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.full },
  tabInactive: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabTextActive: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },

  content: { flex: 1 },

  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    paddingVertical: 0,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(123,47,247,0.2)',
    borderColor: COLORS.purple,
  },
  filterChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.purple, fontWeight: '700' },

  listCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
});
