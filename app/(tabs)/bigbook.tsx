import { StyleSheet } from "react-native";
import { BigBookMain } from "@/components/bigbook-v2/BigBookMain";
import ScreenContainer from "@/components/ScreenContainer";
import { useReadingSession } from "@/hooks/useReadingSession";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering with BigBookMain');
  useReadingSession("literature");
  
  return (
    <ScreenContainer style={styles.container} noPadding>
      <BigBookMain />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});