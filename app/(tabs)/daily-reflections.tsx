import React, { useMemo, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePostHog } from 'posthog-react-native';
import ScreenContainer from '@/components/ScreenContainer';
import DailyReflection from '@/components/DailyReflection';
import { useTextSettings } from '@/hooks/use-text-settings';
import { DailyReflectionBookmarksProvider } from '@/hooks/use-daily-reflection-bookmarks';

export default function DailyReflectionsPage() {
  const posthog = usePostHog();
  const { fontSize, lineHeight, resetDefaults } = useTextSettings();
  
  useEffect(() => {
    posthog?.screen('Daily Reflection');
  }, [posthog]);
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      resetDefaults();
      posthog?.capture('daily_reflection_reset_font_size');
    })
    .runOnJS(true), [resetDefaults, posthog]);

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