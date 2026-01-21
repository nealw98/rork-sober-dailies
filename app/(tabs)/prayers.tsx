import { StyleSheet } from "react-native";
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import { PrayersMain } from "@/components/PrayersMain";
import ScreenContainer from "@/components/ScreenContainer";

export default function PrayersScreen() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen('Prayers');
  }, [posthog]);

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
