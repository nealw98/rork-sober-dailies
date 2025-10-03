import { StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient
          colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
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
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});