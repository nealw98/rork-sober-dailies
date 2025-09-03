import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import TwelveAndTwelveBrowser from "@/components/TwelveAndTwelveBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function TwelveAndTwelveScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        headerBackTitle: "Back",
        headerBackTitleStyle: {
          fontSize: 14
        },
        headerTitle: Platform.OS === 'android' ? '' : undefined
      }} />
      <ScreenContainer style={styles.container} noPadding>
        <TwelveAndTwelveBrowser />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});