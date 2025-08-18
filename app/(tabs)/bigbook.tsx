import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import BigBookBrowser from "@/components/BigBookBrowser";
import ScreenContainer from "@/components/ScreenContainer";

export default function BigBookScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        headerBackTitle: "Back",
        headerTitle: "Alcoholics Anonymous",
        headerTitleAlign: "center",
        headerBackTitleStyle: {
          fontSize: 14
        }
      }} />
      <ScreenContainer style={styles.container}>
        <BigBookBrowser />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});