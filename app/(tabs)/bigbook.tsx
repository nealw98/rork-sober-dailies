import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import BigBookBrowser from "@/components/BigBookBrowser";
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";
import { useReadingSession } from "@/hooks/useReadingSession";
import TextSettingsButton from "@/components/TextSettingsButton";

export default function BigBookScreen() {
  console.log('🟢 BigBookScreen: Component rendering');
  useReadingSession('literature');
  
  return (
    <ScreenContainer style={styles.container} noPadding>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerRight: () => <TextSettingsButton compact />,
        }}
      />
      <BigBookBrowser />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});