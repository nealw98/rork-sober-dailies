import React from 'react';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import { useScreenTimeTracking } from '@/hooks/useScreenTimeTracking';

export default function DailyReflectionsPage() {
  useScreenTimeTracking('Daily Reflections');

  return (
    <ScreenContainer noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <DailyReflection />
    </ScreenContainer>
  );
}
