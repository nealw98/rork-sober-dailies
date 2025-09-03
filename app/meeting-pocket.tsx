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
        headerTitle: Platform.OS === 'android' ? '' : undefined
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
