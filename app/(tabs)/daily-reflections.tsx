import React from 'react';
import { Platform } from 'react-native';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';

export default function DailyReflectionsPage() {
  return (
    <ScreenContainer noPadding>
      <DailyReflection />
    </ScreenContainer>
  );
}