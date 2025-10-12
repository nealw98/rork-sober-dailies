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
  Alert,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, RotateCcw } from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from "@/constants/colors";
import { useChatStore } from "@/hooks/use-chat-store";
import { featureUse } from "@/lib/usageLogger";
import { ChatMessage, SponsorType } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";
import { CustomTextRenderer } from "./CustomTextRenderer";
import { ChatMarkdownRenderer } from "./ChatMarkdownRenderer";

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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePressIn = () => {
    // Start long press timer
    longPressTimer.current = setTimeout(async () => {
      try {
        // Stronger haptic feedback when long press activates
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        // Copy happens immediately when long press activates
        await Clipboard.setStringAsync(message.text);
        // Show copied message immediately
        Alert.alert("Copied!", "", [{ text: "OK" }]);
      } catch (error) {
        Alert.alert("Copy Failed", "", [{ text: "OK" }]);
      }
    }, 500); // 500ms delay for long press
  };

  const handlePressOut = () => {
    // Clear the timer if user releases before long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
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
      <TouchableOpacity
        style={[
          styles.bubble,
          getBotBubbleStyle(),
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {isUser ? (
          <Text style={styles.messageText}>{message.text}</Text>
        ) : (
          <ChatMarkdownRenderer content={message.text} style={styles.messageText} />
        )}
      </TouchableOpacity>
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
    
    // Log sponsor message usage
    const sponsorName = getSponsorDisplayName(sponsorType);
    featureUse(`SponsorMessage_${sponsorName}`, 'Chat');
    
    sendMessage(inputText);
    setInputText("");
    Keyboard.dismiss(); // Dismiss keyboard after sending
  };

  const handleClearChat = () => {
    clearChat();
  };

  // Helper function to get sponsor display name for logging
  const getSponsorDisplayName = (type: SponsorType): string => {
    switch (type) {
      case "salty":
        return "SaltySam";
      case "supportive":
        return "SteadyEddie";
      case "grace":
        return "GentleGrace";
      default:
        return "Unknown";
    }
  };

  // Get placeholder text based on sponsor type
  const getPlaceholderText = () => {
    switch (sponsorType) {
      case "salty":
        return "Tell Sam what's got you sideways...";
      case "supportive":
        return "Tell Eddie what's on your mind...";
      case "grace":
        return "Tell Grace what's in your heart...";
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
    >
      <LinearGradient
        colors={[Colors.light.chatBubbleUser, Colors.light.chatBubbleBot]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>AI Sponsors</Text>
        <Text style={styles.headerSubtitle}>Select a sponsor that fits your style</Text>
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
      
      <View style={styles.messagesWrapper}>
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
      </View>
      
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={getPlaceholderText()}
          placeholderTextColor={Colors.light.muted}
          multiline={true}
          maxLength={500}
          returnKeyType="done"
          blurOnSubmit={true}
          textAlignVertical="top"
          textBreakStrategy="simple"
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: adjustFontWeight("700", true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
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
    backgroundColor: 'transparent',
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    margin: 12,
    marginBottom: 0,
    overflow: 'hidden',
    // Level 3: Content Cards (Medium depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    // Level 2: Interactive Cards (High depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
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
    // Level 2: Interactive Cards (High depth)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  userBubble: {
    backgroundColor: "#b8d9f0", // Even darker blue for better contrast
    borderBottomRightRadius: 4,
  },
  supportiveBubble: {
    backgroundColor: "#e8f8e8", // Light green for Eddie (supportive sponsor)
    borderBottomLeftRadius: 4,
  },
  graceBubble: {
    backgroundColor: "#e8d4f0", // Darker lavender for better contrast
    borderBottomLeftRadius: 4,
  },
  saltyBubble: {
    backgroundColor: "#fff0d4", // Darker amber for better contrast
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
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' && {
      paddingBottom: Platform.OS === 'android' ? 8 : 12,
    }),
  },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
    // Soft drop shadow for subtle lift
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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