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
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ChevronLeft, RotateCcw, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { ChatStoreProvider, useChatStore } from "@/hooks/use-chat-store";
import { getSponsorById, SPONSORS } from "@/constants/sponsors";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { useTextSettings } from "@/hooks/use-text-settings";
import { SponsorType, ChatMessage } from "@/types";
import { ChatMarkdownRenderer } from "@/components/ChatMarkdownRenderer";
import { featureUse, getAnonymousId } from "@/lib/usageLogger";
import { usePostHog } from 'posthog-react-native';
import { supabase } from "@/lib/supabase";

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

    if (dailyResult.error) throw dailyResult.error;
    if (monthlyResult.error) throw monthlyResult.error;

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
      error: "We couldn't verify your AI Sponsor usage limits. Please try again shortly.",
    };
  }
};

const ChatBubble = ({
  message,
  bubbleColor,
  bubbleBorderColor,
  sponsorType,
  fontSize,
}: {
  message: ChatMessage;
  bubbleColor?: string;
  bubbleBorderColor?: string;
  sponsorType: SponsorType;
  fontSize: number;
}) => {
  const isUser = message.sender === "user";
  const sponsor = getSponsorById(sponsorType);
  const messageText = message.text;

  const handleLongPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Clipboard.setStringAsync(messageText);
      Alert.alert("Copied", "Message copied to clipboard");
    } catch {
      // ignore
    }
  };
  
  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.9}
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.botBubble,
        !isUser && bubbleColor ? { backgroundColor: bubbleColor } : {},
        !isUser && bubbleBorderColor ? { borderWidth: 2, borderColor: bubbleBorderColor } : {},
      ]}
    >
      {!isUser && sponsor?.avatar && (
        <Image source={sponsor.avatar} style={styles.bubbleAvatar} />
      )}
      <View style={styles.bubbleContent}>
        <ChatMarkdownRenderer 
          content={messageText} 
          style={{ color: isUser ? '#fff' : '#333', fontSize }}
        />
      </View>
    </TouchableOpacity>
  );
};

function SponsorChatContent({ initialSponsor }: { initialSponsor: string }) {
  const posthog = usePostHog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const textSettings = useTextSettings();
  const fontSize = textSettings?.fontSize ?? 18;
  const { messages, isLoading, sendMessage, clearChat, changeSponsor, sponsorType } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Sync sponsor type with store on mount
  useEffect(() => {
    const targetSponsor = initialSponsor as SponsorType;
    if (targetSponsor !== sponsorType) {
      changeSponsor(targetSponsor);
    }
  }, [initialSponsor, sponsorType, changeSponsor]);

  // Use the initialSponsor directly for display (we know it's valid)
  const sponsor = getSponsorById(initialSponsor as SponsorType);

  // Track screen time with sponsor name
  // TODO: Re-enable once useScreenTimeTracking hook is fixed
  // useScreenTimeTracking(sponsor ? sponsor.name : 'Unknown Sponsor');
  
  const bubbleColor = sponsor?.bubbleColor;
  const bubbleBorderColor = sponsor?.bubbleBorderColor;
  const placeholderText = sponsor?.placeholderText ?? "Type a message...";
  const loadingText = sponsor?.loadingText ?? "Thinking...";

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    clearChat();
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isCheckingLimits) return;

    setIsCheckingLimits(true);
    const limitResult = await checkSponsorMessageLimits();
    setIsCheckingLimits(false);

    if (!limitResult.allowed) {
      if ("error" in limitResult) {
        Alert.alert("Error", limitResult.error);
      } else if (limitResult.reason === "daily") {
        Alert.alert(
          "Daily Limit Reached",
          `You've reached the daily limit of ${DAILY_SPONSOR_LIMIT} messages. Please try again tomorrow.`
        );
      } else {
        Alert.alert(
          "Monthly Limit Reached",
          `You've reached the monthly limit of ${MONTHLY_SPONSOR_LIMIT} messages. Limits reset at the start of each month.`
        );
      }
      return;
    }

    setInputText("");
    featureUse(`SponsorMessage_${getSponsorDisplayName(sponsorType)}`);
    
    // TODO: Remove Supabase tracking after PostHog validation
    posthog?.capture('sponsor_message_sent', { 
      $screen_name: sponsor ? sponsor.name : 'Unknown Sponsor',
      sponsor_name: getSponsorDisplayName(sponsorType)
    });
    
    await sendMessage(trimmed);
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

  // Show loading while syncing sponsor
  if (sponsorType !== initialSponsor) {
    return null;
  }

  if (!sponsor || !sponsor.isAvailable) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sponsor not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSendDisabled = !inputText.trim() || isLoading || isCheckingLimits;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Gradient header with avatar and sponsor name */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Sponsor Name */}
        <View style={styles.sponsorInfo}>
          <Text style={styles.headerTitle}>{sponsor.name}</Text>
        </View>
      </LinearGradient>
      
      {/* Action row below header */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleRefresh}
          accessible={true}
          accessibilityLabel="Reset conversation"
          accessibilityRole="button"
          activeOpacity={0.6}
          style={styles.actionButton}
        >
          <RotateCcw color="#3D8B8B" size={18} />
          <Text style={styles.actionButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      {/* Chat area with off-white background */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.messagesWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                bubbleColor={bubbleColor}
                bubbleBorderColor={bubbleBorderColor}
                sponsorType={initialSponsor as SponsorType}
                fontSize={fontSize}
              />
            )}
            contentContainerStyle={styles.chatContainer}
            showsVerticalScrollIndicator={false}
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
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSendDisabled && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isSendDisabled}
          >
            <Send
              size={20}
              color={isSendDisabled ? Colors.light.muted : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function SponsorChatScreen() {
  const params = useLocalSearchParams<{ sponsor: string }>();
  const initialSponsor = params.sponsor || "supportive";

  return (
    <ChatStoreProvider>
      <SponsorChatContent initialSponsor={initialSponsor} />
    </ChatStoreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3D8B8B',
    fontWeight: '500',
  },
  sponsorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  chatArea: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.tint,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f8e8',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  bubbleContent: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#f5f6f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6f8',
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
  },
});
