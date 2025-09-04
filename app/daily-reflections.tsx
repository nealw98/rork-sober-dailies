import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';

export default function DailyReflectionsPage() {
  return (
    <>
      <Stack.Screen options={{
        // Title on Android only; hide on iOS
        headerTitle: Platform.OS === 'android' ? 'Daily Reflections' : ''
      }} />
      <ScreenContainer noPadding>
        <DailyReflection />
      </ScreenContainer>
    </>
  );
}