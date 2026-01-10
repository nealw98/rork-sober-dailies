import { StyleSheet } from "react-native";
import { Stack } from 'expo-router';
import { PrayersMain } from "@/components/PrayersMain";
import ScreenContainer from "@/components/ScreenContainer";

export default function PrayersScreen() {
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
