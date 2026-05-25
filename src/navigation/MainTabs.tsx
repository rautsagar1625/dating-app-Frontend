import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, AppState, Dimensions } from 'react-native';

const TAB_COUNT   = 4;
const TAB_WIDTH   = Dimensions.get('window').width / TAB_COUNT;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { MainTabParamList } from './types';
import BrowseScreen from '../screens/BrowseScreen';
import CrushesScreen from '../screens/CrushesScreen';
import ChatListScreen from '../screens/ChatListScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { COLORS, FONTS, SHADOWS } from '../utils/theme';
import { useNotificationStore } from '../store/notificationStore';
import { getSocket } from '../services/socket';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Tab-level error boundaries ─────────────────────────────────────────────
function withTabErrorBoundary(Screen: React.ComponentType<any>, tabName: string) {
  return function TabScreenWithBoundary(props: any) {
    return (
      <ErrorBoundary key={tabName} level="screen">
        <Screen {...props} />
      </ErrorBoundary>
    );
  };
}

const BrowseWithBoundary   = withTabErrorBoundary(BrowseScreen,   'Browse');
const CrushesWithBoundary  = withTabErrorBoundary(CrushesScreen,  'Crushes');
const ChatListWithBoundary = withTabErrorBoundary(ChatListScreen,  'Messages');
const MyProfileWithBoundary = withTabErrorBoundary(MyProfileScreen, 'MyProfile');

// ── TabIcon ────────────────────────────────────────────────────────────────

interface TabIconProps {
  icon:     React.ReactNode;
  label:    string;
  focused:  boolean;
  badge?:   string | number;
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
    width: TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 46,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerInactive: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
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
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  badgeText: { color: COLORS.white, fontSize: 8, fontWeight: '800' },
});

// ── MainTabs ───────────────────────────────────────────────────────────────

export default function MainTabs() {
  const chatUnreadCount = useNotificationStore((s) => s.chatUnreadCount);
  const incrementChatUnread = useNotificationStore((s) => s.incrementChatUnread);
  const qc = useQueryClient();

  // Re-query subscription and wallet whenever app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        qc.invalidateQueries({ queryKey: ['subscription', 'status'] });
        qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      }
    });
    return () => sub.remove();
  }, [qc]);

  // Track new messages for the tab badge — only while NOT on Messages tab
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { senderId: string }) => {
      // Increment badge when a message arrives from someone else
      if (data?.senderId) incrementChatUnread();
    };

    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [incrementChatUnread]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          height:          68,
          paddingBottom:   0,
          paddingTop:      0,
          paddingHorizontal: 0,
        },
        tabBarItemStyle: {
          flex:            1,
          height:          68,
          paddingVertical: 0,
          paddingHorizontal: 0,
          justifyContent:  'center',
          alignItems:      'center',
        },
        tabBarShowLabel: false,
      }}
    >
      {/* 1. Discover */}
      <Tab.Screen
        name="Browse"
        component={BrowseWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<Ionicons name="flame" size={20} color={COLORS.white} />}
              label="Discover"
              focused={focused}
            />
          ),
        }}
      />

      {/* 2. Crushes */}
      <Tab.Screen
        name="Crushes"
        component={CrushesWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<Ionicons name="heart" size={20} color={COLORS.white} />}
              label="Crushes"
              focused={focused}
            />
          ),
        }}
      />

      {/* 3. Messages ← NEW, was Wallet */}
      <Tab.Screen
        name="Messages"
        component={ChatListWithBoundary}
        listeners={{
          tabPress: () => {
            // Clear unread badge when user opens messages tab
            useNotificationStore.getState().clearChatUnread();
          },
        }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<Ionicons name="chatbubbles" size={20} color={COLORS.white} />}
              label="Messages"
              focused={focused}
              badge={chatUnreadCount > 0 ? (chatUnreadCount > 99 ? '99+' : chatUnreadCount) : undefined}
            />
          ),
        }}
      />

      {/* 4. Profile */}
      <Tab.Screen
        name="MyProfile"
        component={MyProfileWithBoundary}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={<Ionicons name="person" size={20} color={COLORS.white} />}
              label="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
