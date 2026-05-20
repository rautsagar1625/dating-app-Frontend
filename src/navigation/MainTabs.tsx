import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { MainTabParamList } from './types';
import BrowseScreen from '../screens/BrowseScreen';
import CrushesScreen from '../screens/CrushesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WalletScreen from '../screens/WalletScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { COLORS, FONTS, SHADOWS } from '../utils/theme';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── P1-9: Tab-level screen wrappers with isolated ErrorBoundaries ─────────────
// Each tab gets its own boundary so a crash in Browse doesn't evict the user
// from the Wallet tab or force a full app restart.
// The `key` prop forces a fresh boundary instance per tab name so recovery
// state doesn't leak across tabs.
function withTabErrorBoundary(Screen: React.ComponentType<any>, tabName: string) {
  return function TabScreenWithBoundary(props: any) {
    return (
      <ErrorBoundary key={tabName} level="screen">
        <Screen {...props} />
      </ErrorBoundary>
    );
  };
}

const BrowseWithBoundary       = withTabErrorBoundary(BrowseScreen, 'Browse');
const CrushesWithBoundary      = withTabErrorBoundary(CrushesScreen, 'Crushes');
const NotificationsWithBoundary = withTabErrorBoundary(NotificationsScreen, 'Notifications');
const WalletWithBoundary       = withTabErrorBoundary(WalletScreen, 'Wallet');
const MyProfileWithBoundary    = withTabErrorBoundary(MyProfileScreen, 'MyProfile');

// ── TabIcon ───────────────────────────────────────────────────────────────────

interface TabIconProps {
  icon: React.ReactNode;
  label: string;
  focused: boolean;
  badge?: string | number;
}

function TabIcon({ icon, label, focused, badge }: TabIconProps) {
  return (
    <View style={tabStyles.wrapper}>
      {focused ? (
        <LinearGradient
          colors={COLORS.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[tabStyles.iconContainer, SHADOWS.glow]}
        >
          {icon}
          {badge !== undefined && (
            <View style={tabStyles.badge}>
              <Text style={tabStyles.badgeText}>{badge}</Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <View style={[tabStyles.iconContainer, tabStyles.iconContainerInactive]}>
          {icon}
          {badge !== undefined && (
            <View style={tabStyles.badge}>
              <Text style={tabStyles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      )}
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingTop: 4,
    width: 72,
    gap: 3,
  },
  iconContainer: {
    width: 44,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerInactive: {
    backgroundColor: 'transparent',
  },
  icon: {},
  label: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.pink,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
});

// ── MainTabs ──────────────────────────────────────────────────────────────────

export default function MainTabs() {
  const credits     = useWalletStore((s) => s.credits);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const qc          = useQueryClient();

  // P1-6: Re-query subscription status whenever the app comes to the foreground.
  // This ensures the subscription screen always reflects server-side state
  // after a Stripe checkout or App Store IAP flow completes in the browser/store.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        qc.invalidateQueries({ queryKey: ['subscription', 'status'] });
        qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      }
    });
    return () => sub.remove();
  }, [qc]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          height: 72,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Browse"
        component={BrowseWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<Ionicons name="flame" size={20} color={COLORS.white} />} label="Discover" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Crushes"
        component={CrushesWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<Ionicons name="heart" size={20} color={COLORS.white} />} label="Crushes" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<Ionicons name="notifications" size={20} color={COLORS.white} />}
              label="Activity"
              focused={focused}
              badge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<Ionicons name="diamond" size={20} color={COLORS.white} />} label="Wallet" focused={focused} badge={credits} />
          ),
        }}
      />
      <Tab.Screen
        name="MyProfile"
        component={MyProfileWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<Ionicons name="person" size={20} color={COLORS.white} />} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
