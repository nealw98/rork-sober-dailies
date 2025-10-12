import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import ChatInterface from "@/components/ChatInterface";
import { ChatStoreProvider } from "@/hooks/use-chat-store";
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";

export default function ChatScreen() {
  return (
    <>
      {Platform.OS === 'android' && (
        <Stack.Screen 
          options={{
            // Let the system pan the window so input remains visible
            android_windowSoftInputMode: "adjustPan",
          }} 
        />
      )}
      <ScreenContainer style={styles.container} noPadding={true}>
        <ChatStoreProvider>
          <ChatInterface />
        </ChatStoreProvider>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
});