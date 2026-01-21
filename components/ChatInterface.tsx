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
  Image,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ChevronDown } from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from "@/constants/colors";
import { useChatStore } from "@/hooks/use-chat-store";
import { featureUse, getAnonymousId } from "@/lib/usageLogger";
import { usePostHog } from 'posthog-react-native';
import { supabase } from "@/lib/supabase";
import { ChatMessage, SponsorType } from "@/types";
import { adjustFontWeight } from "@/constants/fonts";
import { useTextSettings } from "@/hooks/use-text-settings";
import { CustomTextRenderer } from "./CustomTextRenderer";
import { ChatMarkdownRenderer } from "./ChatMarkdownRenderer";

const DAILY_SPONSOR_LIMIT = 50;
const MONTHLY_SPONSOR_LIMIT = 200;

type LimitCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "daily" | "monthly"; count: number }
  | { allowed: false; error: string };

const checkSponsorMessageLimits = async (): Promise<LimitCheckResult> => {
  try {
    const anonymousId = await getAnonymousId();

    const now = new Date();
    const todayUtc = now.toISOString().split("T")[0];
    const startOfMonthUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
    ).toISOString();

    const [dailyResult, monthlyResult] = await Promise.all([
      supabase
        .from("usage_events")
        .select("id", { head: true, count: "exact" })
        .eq("anonymous_id", anonymousId)
        .eq("event", "feature_use")
        .ilike("feature", "SponsorMessage\\_%")
        .eq("day_utc", todayUtc),
      supabase
        .from("usage_events")
        .select("id", { head: true, count: "exact" })
        .eq("anonymous_id", anonymousId)
        .eq("event", "feature_use")
        .ilike("feature", "SponsorMessage\\_%")
        .gte("ts", startOfMonthUtc),
    ]);

    if (dailyResult.error) {
      throw dailyResult.error;
    }
    if (monthlyResult.error) {
      throw monthlyResult.error;
    }

    const dailyCount = dailyResult.count ?? 0;
    const monthlyCount = monthlyResult.count ?? 0;

    if (dailyCount >= DAILY_SPONSOR_LIMIT) {
      return { allowed: false, reason: "daily", count: dailyCount };
    }

    if (monthlyCount >= MONTHLY_SPONSOR_LIMIT) {
      return { allowed: false, reason: "monthly", count: monthlyCount };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[Chat] Failed to check AI Sponsor usage limits:", error);
    return {
      allowed: false,
      error:
        "We couldn't verify your AI Sponsor usage limits. Please try again shortly.",
    };
  }
};

interface ChatInterfaceProps {
  sponsorType: SponsorType;
  onSponsorPress?: (position: { x: number; y: number; width: number }) => void;
}

const ChatBubble = ({
  message,
  bubbleColor,
  bubbleShadowColor,
  sponsorType,
  fontSize,
  lineHeight,
}: {
  message: ChatMessage;
  bubbleColor?: string;
  bubbleShadowColor?: string;
  sponsorType: SponsorType;
  fontSize: number;
  lineHeight: number;
}) => {
  const isUser = message.sender === "user";

  const getBotBubbleStyle = () => {
    if (isUser) return styles.userBubble;
    if (bubbleColor) {
      return { backgroundColor: bubbleColor };
    }
    return styles.supportiveBubble;
  };

  const isFresh = sponsorType === 'fresh' && !isUser;
  const bubbleStyle = [
    styles.bubble,
    isFresh ? styles.freshBubbleBase : getBotBubbleStyle(),
    bubbleShadowColor ? { shadowColor: bubbleShadowColor } : null,
  ];

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
        style={bubbleStyle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {isUser ? (
          <Text style={[styles.userMessageText, { fontSize, lineHeight }]}>{message.text}</Text>
        ) : (
          <ChatMarkdownRenderer content={message.text} style={[styles.messageText, { fontSize, lineHeight }]} />
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

export default function ChatInterface({ 
  sponsorType: propSponsorType,
  onSponsorPress,
}: ChatInterfaceProps) {
  const posthog = usePostHog();
  const { messages, isLoading, sendMessage, sponsorType: storeSponsorType, changeSponsor } = useChatStore();
  const textSettings = useTextSettings();
  const fontSize = textSettings?.fontSize ?? 18;
  const lineHeight = textSettings?.lineHeight ?? 27;
  const [inputText, setInputText] = useState<string>("");
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const selectorRef = useRef<TouchableOpacity | null>(null);
  const insets = useSafeAreaInsets();
  
  // Always use the prop sponsor type and sync to store immediately
  const sponsorType = propSponsorType ?? storeSponsorType;
  
  // Sync prop to store on mount and whenever it changes
  useEffect(() => {
    if (propSponsorType && propSponsorType !== storeSponsorType) {
      console.log('[ChatInterface] Syncing sponsor:', propSponsorType, 'store was:', storeSponsorType);
      changeSponsor(propSponsorType);
    }
  }, [propSponsorType, storeSponsorType, changeSponsor]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSend = async () => {
    if (inputText.trim() === "" || isLoading || isCheckingLimits) return;

    setIsCheckingLimits(true);
    let limitResult: LimitCheckResult | undefined;
    try {
      limitResult = await checkSponsorMessageLimits();
    } finally {
      setIsCheckingLimits(false);
    }

    if (!limitResult || !limitResult.allowed) {
      if (limitResult && "reason" in limitResult) {
        const title =
          limitResult.reason === "daily"
            ? "Daily Limit Reached"
            : "Monthly Limit Reached";
        const message =
          limitResult.reason === "daily"
            ? `You've reached the daily limit of ${DAILY_SPONSOR_LIMIT} AI Sponsor messages. Please check back tomorrow.`
            : `You've reached the monthly limit of ${MONTHLY_SPONSOR_LIMIT} AI Sponsor messages. Please check back next month.`;
        Alert.alert(title, message);
      } else {
        Alert.alert(
          "Usage Limit Check Failed",
          limitResult?.error ??
            "We couldn't verify your AI Sponsor usage limits. Please try again shortly."
        );
      }
      return;
    }

    const sponsorName = getSponsorDisplayName(sponsorType);
    featureUse(`SponsorMessage_${sponsorName}`, 'Chat');

    // TODO: Remove Supabase tracking after PostHog validation
    posthog?.capture('feature_use', { 
      feature: `SponsorMessage_${sponsorName}`, 
      screen: 'Chat' 
    });

    const textToSend = inputText;
    setInputText("");
    Keyboard.dismiss();
    void sendMessage(textToSend);
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
      case "cowboy-pete":
        return "CowboyPete";
      case "co-sign-sally":
        return "CoSignSally";
      case "fresh":
        return "FreshFreddie";
      case "mama-jo":
        return "MamaJo";
      default:
        return type;
    }
  };

  // Get sponsor config
  const getSponsorConfig = () => {
    const { getSponsorById } = require("@/constants/sponsors");
    return getSponsorById(sponsorType);
  };

  const sponsorConfig = getSponsorConfig();
  const placeholderText = sponsorConfig?.placeholderText || "Type your message...";
  const loadingText = sponsorConfig?.loadingText || "Thinking...";
  const bubbleColor = sponsorConfig?.bubbleColor;
  const bubbleShadowColor = sponsorConfig?.bubbleShadowColor;

  const isSendDisabled = !inputText.trim() || isLoading || isCheckingLimits;

  const handleSponsorSelectorPress = () => {
    if (!onSponsorPress || !selectorRef.current) {
      return;
    }
    selectorRef.current.measureInWindow((x = 0, y = 0, width = 0, height = 0) => {
      onSponsorPress({ x, y: y + height + 4, width });
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <LinearGradient
        colors={Colors.gradients.mainThreeColor}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          ref={selectorRef}
          style={styles.selectorCard}
          onPress={handleSponsorSelectorPress}
          activeOpacity={0.75}
        >
          {sponsorConfig?.avatar ? (
            <Image source={sponsorConfig.avatar} style={styles.selectorAvatar} />
          ) : (
            <View style={styles.selectorAvatarPlaceholder}>
              <Text style={styles.selectorAvatarInitial}>
                {sponsorConfig?.name?.charAt(0) ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.selectorTextWrapper}>
            <Text style={styles.selectorName} numberOfLines={1}>
              {sponsorConfig?.name ?? "Sponsor"}
            </Text>
            <Text style={styles.selectorHint}>Tap to switch sponsors</Text>
          </View>
          <ChevronDown color={Colors.light.text} size={20} />
        </TouchableOpacity>
      </View>
      <View style={styles.messagesWrapper}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              bubbleColor={bubbleColor}
              bubbleShadowColor={bubbleShadowColor}
              sponsorType={sponsorType}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          )}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          testID="chat-message-list"
          keyboardShouldPersistTaps="handled"
        />
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.light.tint} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}
      </View>
      
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholderText}
          placeholderTextColor={Colors.light.muted}
          multiline
          maxLength={500}
          returnKeyType="done"
          blurOnSubmit
          textAlignVertical="top"
          textBreakStrategy="simple"
          testID="chat-input"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            isSendDisabled && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isSendDisabled}
          testID="send-button"
        >
          <Send
            size={20}
            color={isSendDisabled ? Colors.light.muted : "#fff"}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 0,
  },
  selectorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  selectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
  },
  selectorAvatarInitial: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.tint,
  },
  selectorTextWrapper: {
    flex: 1,
  },
  selectorName: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
  },
  selectorHint: {
    fontSize: 12,
    color: Colors.light.muted,
    marginTop: 2,
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "android" ? 16 : 20,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  freshBubbleBase: {
    backgroundColor: "#CCFBF1",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#14B8A6",
  },
  userBubble: {
    backgroundColor: "#BFDBFE",
    borderBottomRightRadius: 4,
  },
  supportiveBubble: {
    backgroundColor: "#e8f8e8",
    borderBottomLeftRadius: 4,
  },
  graceBubble: {
    backgroundColor: "#e8d4f0",
    borderBottomLeftRadius: 4,
  },
  saltyBubble: {
    backgroundColor: "#fff0d4",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 18,
    color: "#1E293B",
    lineHeight: 24,
    fontWeight: adjustFontWeight("400"),
  },
  userMessageText: {
    fontSize: 16,
    color: "#1E293B",
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
    backgroundColor: "transparent",
    ...(Platform.OS === "android" && {
      paddingBottom: 8,
    }),
  },
  input: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: "top",
    shadowColor: "#000",
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.divider,
  },
});