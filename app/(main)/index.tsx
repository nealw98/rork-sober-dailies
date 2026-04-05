import React from 'react';
import HomeScreen from '@/app/components/HomeScreen';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

export default function Home() {
  useScreenTimeTracking('Home');
  
  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeScreen />
    </ScreenContainer>
  );
}
