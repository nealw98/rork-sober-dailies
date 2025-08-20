import React from 'react';
import HomeScreen from '../components/HomeScreen';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';

export default function Home() {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Sober Dailies' }} />
      <HomeScreen />
    </ScreenContainer>
  );
}
