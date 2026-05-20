import React from 'react';
import { Modal, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/authStore';
import { useQuickExitStore } from '../store/quickExitStore';
import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import AppStack from './AppStack';
import NeutralScreen from '../screens/NeutralScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const user      = useAuthStore((s) => s.user);
  const token     = useAuthStore((s) => s.token);
  const hydrated  = useAuthStore((s) => s._hydrated);
  const isLocked  = useQuickExitStore((s) => s.isLocked);

  // Block rendering until SecureStore has rehydrated — prevents the auth
  // stack from flashing before persisted credentials are available.
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#0F0F0F' }} />;
  }

  const isLoggedIn      = !!token;
  const needsOnboarding = isLoggedIn && user && !user.isProfileComplete;

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingStack} />
        ) : (
          <Stack.Screen name="App" component={AppStack} />
        )}
      </Stack.Navigator>

      <Modal
        visible={isLocked}
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
      >
        <NeutralScreen />
      </Modal>
    </>
  );
}
