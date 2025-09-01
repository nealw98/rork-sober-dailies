import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import MeetingPocketBrowser from "@/components/MeetingPocketBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function MeetingPocketScreen() {
  console.log('🟢 MeetingPocketScreen: Component rendering');
  
  return (
    <>
      <Stack.Screen options={{ 
        headerBackTitle: "Back",
        headerTitle: "AA Meeting in a Pocket",
        headerTitleAlign: "center",
        headerBackTitleStyle: {
          fontSize: 14
        }
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
