import { StyleSheet, Platform } from "react-native";
import MeetingPocketBrowser from "@/components/MeetingPocketBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function MeetingPocketScreen() {
  console.log('🟢 MeetingPocketScreen: Component rendering');
  
  return (
    <ScreenContainer noPadding style={styles.container}>
      <MeetingPocketBrowser />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
