import { StyleSheet } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import ChatInterface from "@/components/ChatInterface";
import { ChatStoreProvider } from "@/hooks/use-chat-store";
import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/colors";

export default function ChatScreen() {
  return (
    <ScreenContainer style={styles.container} noPadding={true}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
      />
      <ChatStoreProvider>
        <ChatInterface />
      </ChatStoreProvider>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});