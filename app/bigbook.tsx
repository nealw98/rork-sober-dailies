import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import BigBookBrowser from "@/components/BigBookBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering');
  
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
      <ScreenContainer style={styles.container} noPadding>
        <BigBookBrowser />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});