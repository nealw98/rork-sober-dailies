import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import { useTextSettings } from '@/hooks/use-text-settings';
import { DailyReflectionBookmarksProvider } from '@/hooks/use-daily-reflection-bookmarks';

export default function DailyReflectionsPage() {
  const { fontSize, lineHeight, resetDefaults } = useTextSettings();
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      resetDefaults();
    })
    .runOnJS(true), [resetDefaults]);

  return (
    <DailyReflectionBookmarksProvider>
      <ScreenContainer noPadding>
        <Stack.Screen options={{ headerShown: false }} />
        <GestureDetector gesture={doubleTapGesture}>
          <DailyReflection
            fontSize={fontSize}
            lineHeight={lineHeight}
          />
        </GestureDetector>
      </ScreenContainer>
    </DailyReflectionBookmarksProvider>
  );
}