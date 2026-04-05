import { StyleSheet, Platform } from "react-native";
import TwelveAndTwelveBrowser from "@/components/TwelveAndTwelveBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import { useReadingSession } from "@/hooks/useReadingSession";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";

export default function TwelveAndTwelveScreen() {
  useReadingSession('literature');
  useScreenTimeTracking('12 Steps & 12 Traditions');

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