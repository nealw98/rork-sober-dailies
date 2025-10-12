import { StyleSheet, Platform } from "react-native";
import TwelveAndTwelveBrowser from "@/components/TwelveAndTwelveBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function TwelveAndTwelveScreen() {
  return (
    <ScreenContainer style={styles.container} noPadding>
      <TwelveAndTwelveBrowser />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});