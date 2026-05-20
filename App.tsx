import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import RootNavigator from './src/navigation/RootNavigator';
import { Toast } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useDeviceFingerprint } from './src/hooks/useDeviceFingerprint';
import { queryClient } from './src/config/queryClient';

export default function App() {
  useDeviceFingerprint();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="light" backgroundColor="#0F0F0F" />
            <Toast />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
