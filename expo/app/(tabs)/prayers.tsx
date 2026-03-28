import { StyleSheet } from "react-native";
import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PrayersMain } from "@/components/PrayersMain";
import ScreenContainer from "@/components/ScreenContainer";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";

export default function PrayersScreen() {
  const posthog = usePostHog();

  useScreenTimeTracking('Prayers');

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('Prayers');
    }, [posthog])
  );

  return (
    <ScreenContainer style={styles.container} noPadding>
      <Stack.Screen options={{ headerShown: false }} />
      <PrayersMain />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
