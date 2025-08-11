import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, RotateCcw } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useChatStore } from "@/hooks/use-chat-store";
import { ChatMessage, SponsorType } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";

const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.sender === "user";
  const { sponsorType } = useChatStore();
  
  // Get the appropriate bubble style based on sponsor type
  const getBotBubbleStyle = () => {
    if (isUser) return styles.userBubble;
    
    switch (sponsorType) {
      case "supportive":
        return styles.supportiveBubble;
      case "grace":
        return styles.graceBubble;
      case "salty":
        return styles.saltyBubble;
      default:
        return styles.supportiveBubble;
    }
  };
  
  return (
    <View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.botBubbleContainer,
      ]}
      testID={`chat-bubble-${message.id}`}
    >
      <View
        style={[
          styles.bubble,
          getBotBubbleStyle(),
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
};

const SponsorToggle = ({ 
  sponsorType, 
  onChange 
}: { 
  sponsorType: SponsorType; 
  onChange: (type: SponsorType) => void;
}) => {
  return (
    <View style={styles.sponsorToggleContainer}>
      <TouchableOpacity
        style={[
          styles.sponsorButton,
          sponsorType === "supportive" && styles.sponsorButtonActive
        ]}
        onPress={() => onChange("supportive")}
        testID="supportive-sponsor-button"
      >
        <Text 
          style={[
            styles.sponsorButtonText,
            sponsorType === "supportive" && styles.sponsorButtonTextActive
          ]}
        >
          Steady Eddie
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.sponsorButton,
          sponsorType === "salty" && styles.sponsorButtonActive
        ]}
        onPress={() => onChange("salty")}
        testID="salty-sponsor-button"
      >
        <Text 
          style={[
            styles.sponsorButtonText,
            sponsorType === "salty" && styles.sponsorButtonTextActive
          ]}
        >
          Salty Sam
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.sponsorButton,
          sponsorType === "grace" && styles.sponsorButtonActive
        ]}
        onPress={() => onChange("grace")}
        testID="grace-sponsor-button"
      >
        <Text 
          style={[
            styles.sponsorButtonText,
            sponsorType === "grace" && styles.sponsorButtonTextActive
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Gentle Grace
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ChatInterface() {
  const { messages, isLoading, sendMessage, clearChat, sponsorType, changeSponsor } = useChatStore();
  const [inputText, setInputText] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() === "") return;
    
    sendMessage(inputText);
    setInputText("");
    Keyboard.dismiss(); // Dismiss keyboard after sending
  };

  const handleClearChat = () => {
    clearChat();
  };

  // Get placeholder text based on sponsor type
  const getPlaceholderText = () => {
    switch (sponsorType) {
      case "salty":
        return "Tell Salty Sam what's got you sideways...";
      case "supportive":
        return "Tell Steady Eddie what's on your mind...";
      case "grace":
        return "Share with Gentle Grace what's in your heart...";
      default:
        return "Type your message...";
    }
  };

  // Get loading text based on sponsor type
  const getLoadingText = () => {
    switch (sponsorType) {
      case "salty":
        return "Salty Sam is thinking...";
      case "supportive":
        return "Steady Eddie is thinking...";
      case "grace":
        return "Gentle Grace is channeling wisdom...";
      default:
        return "Thinking...";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Choose Your AI Sponsor</Text>
        <Text style={styles.headerSubtitle}>Select a voice that fits your mood</Text>
      </View>
      
      <View style={styles.topContainer}>
        <SponsorToggle 
          sponsorType={sponsorType} 
          onChange={changeSponsor}
        />
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearChat}
          testID="clear-chat-button"
        >
          <RotateCcw size={18} color={Colors.light.muted} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        testID="chat-message-list"
        keyboardShouldPersistTaps="handled"
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={styles.loadingText}>{getLoadingText()}</Text>
        </View>
      )}
      
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={getPlaceholderText()}
          placeholderTextColor={Colors.light.muted}
          multiline={false}
          maxLength={500}
          returnKeyType="done"
          blurOnSubmit={true}
          testID="chat-input"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          testID="send-button"
        >
          <Send
            size={20}
            color={!inputText.trim() || isLoading ? Colors.light.muted : "#fff"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerContainer: {
    backgroundColor: Colors.light.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontStyle: "italic" as const,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.muted,
  },
  topContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  clearButton: {
    padding: 12,
    marginRight: 4,
  },
  sponsorToggleContainer: {
    flex: 1,
    flexDirection: "row",
    padding: 8,
  },
  sponsorButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 2,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.divider,
  },
  sponsorButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  sponsorButtonText: {
    fontSize: 13,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.muted,
    flexShrink: 1,
  },
  sponsorButtonTextActive: {
    color: "#fff",
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  bubbleContainer: {
    marginBottom: 12,
    maxWidth: "80%",
    alignItems: "flex-end",
  },
  userBubbleContainer: {
    alignSelf: "flex-end",
  },
  botBubbleContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 60,
  },
  userBubble: {
    backgroundColor: "rgba(74, 144, 226, 0.3)", // Exact light blue from daily reflection gradient
    borderBottomRightRadius: 4,
  },
  supportiveBubble: {
    backgroundColor: "rgba(92, 184, 92, 0.1)", // Exact light green from daily reflection gradient
    borderBottomLeftRadius: 4,
  },
  graceBubble: {
    backgroundColor: "rgba(186, 85, 211, 0.1)", // Light lavender for Grace
    borderBottomLeftRadius: 4,
  },
  saltyBubble: {
    backgroundColor: "rgba(255, 191, 0, 0.1)", // Light amber for Salty Sam
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 22,
    fontWeight: adjustFontWeight("400"),
  },
  timestamp: {
    fontSize: 11,
    color: Colors.light.muted,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.light.muted,
    marginLeft: 4,
    fontWeight: adjustFontWeight("400"),
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    height: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.divider,
  },
});