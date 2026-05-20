import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAppState } from '../hooks/useAppState';
import { BetaFeedback } from '../components/BetaFeedback';
import { AppStackParamList } from './types';
import MainTabs from './MainTabs';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatListScreen from '../screens/ChatListScreen';
import VisitorsScreen from '../screens/VisitorsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import AdminScreen from '../screens/AdminScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import PhotoAccessRequestsScreen from '../screens/PhotoAccessRequestsScreen';
import { QuickExitButton } from '../components/QuickExitButton';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  usePresence();
  useSocket();
  usePushNotifications();
  useAppState();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0F0F0F' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="Visitors" component={VisitorsScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="PhotoAccessRequests" component={PhotoAccessRequestsScreen} />
      </Stack.Navigator>
      <QuickExitButton />
      <BetaFeedback enabled />
    </View>
  );
}
