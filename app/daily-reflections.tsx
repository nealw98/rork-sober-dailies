import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';

export default function DailyReflectionsPage() {
  return (
    <>
      <Stack.Screen options={{
        headerTitle: Platform.OS === 'android' ? '' : undefined
      }} />
      <ScreenContainer noPadding>
        <DailyReflection />
      </ScreenContainer>
    </>
  );
}