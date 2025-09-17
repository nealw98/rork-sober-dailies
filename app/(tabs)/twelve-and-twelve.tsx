import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import TwelveAndTwelveBrowser from "@/components/TwelveAndTwelveBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function TwelveAndTwelveScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: '',
        headerBackTitle: '',
        headerBackTitleVisible: false
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