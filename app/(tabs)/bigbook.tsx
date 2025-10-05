import { StyleSheet, Platform } from "react-native";
import BigBookBrowser from "@/components/BigBookBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering');
  
  return (
    <ScreenContainer style={styles.container} noPadding>
      <BigBookBrowser />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});