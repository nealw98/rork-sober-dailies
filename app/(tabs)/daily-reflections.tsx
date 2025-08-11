import React from 'react';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';

export default function DailyReflectionsTab() {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Daily Reflections' }} />
      <DailyReflection />
    </ScreenContainer>
  );
}