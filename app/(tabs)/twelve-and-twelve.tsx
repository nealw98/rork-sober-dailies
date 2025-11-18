import { StyleSheet, Platform } from "react-native";
import TwelveAndTwelveBrowser from "@/components/TwelveAndTwelveBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import { useReadingSession } from "@/hooks/useReadingSession";

export default function TwelveAndTwelveScreen() {
  useReadingSession('literature');

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