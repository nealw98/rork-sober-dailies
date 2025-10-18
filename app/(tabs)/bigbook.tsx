import { StyleSheet } from "react-native";
import { BigBookMain } from "@/components/bigbook-v2/BigBookMain";
import ScreenContainer from "@/components/ScreenContainer";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering with BigBookMain');
  
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