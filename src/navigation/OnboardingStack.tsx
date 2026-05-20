import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F0F' } }}>
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}
