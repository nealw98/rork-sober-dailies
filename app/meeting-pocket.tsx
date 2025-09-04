import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import MeetingPocketBrowser from "@/components/MeetingPocketBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function MeetingPocketScreen() {
  console.log('🟢 MeetingPocketScreen: Component rendering');
  
  return (
    <>
      <Stack.Screen options={{ 
        headerBackTitle: "Back",
        headerBackTitleStyle: {
          fontSize: 14
        },
        // Hide the title on all platforms (iOS per request; Android kept hidden)
        headerTitle: ''
      }} />
      <ScreenContainer noPadding style={styles.container}>
        <MeetingPocketBrowser />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
