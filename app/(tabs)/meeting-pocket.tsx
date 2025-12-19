import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import MeetingPocketBrowser from "@/components/MeetingPocketBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import { useReadingSession } from "@/hooks/useReadingSession";
import TextSettingsButton from "@/components/TextSettingsButton";

export default function MeetingPocketScreen() {
  console.log('🟢 MeetingPocketScreen: Component rendering');
  useReadingSession('literature');
  
  return (
    <ScreenContainer noPadding style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerRight: () => <TextSettingsButton compact />,
        }}
      />
      <MeetingPocketBrowser />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
