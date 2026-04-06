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
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ChatStoreProvider, useChatStore } from "@/hooks/use-chat-store";
import { getSponsorById, SPONSORS } from "@/constants/sponsors";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";
import { useTheme } from "@/hooks/useTheme";
import { useTextSettings } from "@/hooks/use-text-settings";
import { SponsorType, ChatMessage } from "@/types";
import { ChatMarkdownRenderer } from "@/components/ChatMarkdownRenderer";
import { featureUse, getAnonymousId } from "@/lib/usageLogger";
import { supabase } from "@/lib/supabase";
import {
  colors,
  semanticColors,
  spacing,
  radii,
  fontFamily,
  fontSize as fontSizeTokens,
  shadows,
} from "@/constants/designTokens";

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
    const startOfTodayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
    ).toISOString();
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
        .gte("ts", startOfTodayUtc),
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

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

const sem = semanticColors.light;

const ChatMessage_View = ({
  message,
  sponsorType,
  fontSize,
  sponsorAvatar,
}: {
  message: ChatMessage;
  sponsorType: SponsorType;
  fontSize: number;
  sponsorAvatar?: any;
}) => {
  const isUser = message.sender === "user";

  const handleLongPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Clipboard.setStringAsync(message.text);
      Alert.alert("Copied", "Message copied to clipboard");
    } catch {
      // ignore
    }
  };

  const isWelcome = message.id.startsWith('welcome-');
  const timeString = isWelcome
    ? 'WELCOME'
    : new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toUpperCase();

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.9}
          style={styles.userBubble}
        >
          <Text style={[styles.userText, { fontSize }]}>{message.text}</Text>
        </TouchableOpacity>
        <Text style={styles.userMeta}>YOU • {timeString}</Text>
      </View>
    );
  }

  const sponsor = getSponsorById(sponsorType);
  const sponsorFirstName = sponsor?.name?.split(' ')[1] || sponsor?.name || '';

  return (
    <View style={styles.sponsorRow}>
      <View style={styles.sponsorBubbleRow}>
        {sponsorAvatar && (
          <Image source={sponsorAvatar} style={styles.sponsorBubbleAvatar} />
        )}
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.9}
          style={styles.sponsorBubble}
        >
          <ChatMarkdownRenderer
            content={message.text}
            style={{ color: sem.text, fontSize }}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.sponsorMeta}>{sponsorFirstName.toUpperCase()} • {timeString}</Text>
    </View>
  );
};

// ─── Main Chat Content ───────────────────────────────────────────────────────

function SponsorChatContent({ initialSponsor }: { initialSponsor: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const textSettings = useTextSettings();
  const fontSize = textSettings?.fontSize ?? 18;
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    changeSponsor,
    sponsorType,
  } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const targetSponsor = initialSponsor as SponsorType;
    if (targetSponsor !== sponsorType) {
      changeSponsor(targetSponsor);
    }
  }, [initialSponsor, sponsorType, changeSponsor]);

  const sponsor = getSponsorById(initialSponsor as SponsorType);
  const screenName = sponsor?.name || "Unknown Sponsor";
  useScreenTimeTracking(screenName);

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
    Alert.alert(
      "Reset Conversation",
      "This will clear your chat history with this sponsor. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => clearChat() },
      ]
    );
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
    await sendMessage(trimmed);
  };

  const getSponsorDisplayName = (type: SponsorType): string => {
    switch (type) {
      case "salty": return "SaltySam";
      case "supportive": return "SteadyEddie";
      case "grace": return "GentleGrace";
      case "cowboy-pete": return "CowboyPete";
      case "co-sign-sally": return "CoSignSally";
      case "fresh": return "FreshFreddie";
      case "mama-jo": return "MamaJo";
      default: return type;
    }
  };

  if (sponsorType !== initialSponsor) return null;

  if (!sponsor || !sponsor.isAvailable) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: sem.text }]}>
          Sponsor not found
        </Text>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.errorButton}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSendDisabled = !inputText.trim() || isLoading || isCheckingLimits;

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header Bar ── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={sem.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {sponsor.avatar && (
            <Image source={sponsor.avatar} style={styles.headerAvatar} />
          )}
          <Text style={[styles.headerName, { color: sem.text }]}>
            {sponsor.name}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.headerResetBtn}
          activeOpacity={0.6}
        >
          <RotateCcw size={18} color={sem.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Chat Messages ── */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage_View
              message={item}
              sponsorType={initialSponsor as SponsorType}
              fontSize={fontSize}
              sponsorAvatar={sponsor.avatar}
            />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={sem.textMuted} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TextInput
            style={[styles.input, { fontSize }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholderText}
            placeholderTextColor={sem.textMuted}
            multiline
            maxLength={500}
            returnKeyType="done"
            blurOnSubmit
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              isSendDisabled && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={isSendDisabled}
          >
            <Send size={18} color={isSendDisabled ? sem.textMuted : colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function SponsorChatScreen() {
  const params = useLocalSearchParams<{ sponsor: string }>();
  const initialSponsor = params.sponsor || "supportive";

  return (
    <ChatStoreProvider>
      <SponsorChatContent initialSponsor={initialSponsor} />
    </ChatStoreProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
  },
  headerName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSizeTokens.lg,
  },
  headerResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },


  // ── Chat Area ──
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // ── Messages ──
  userRow: {
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    maxWidth: "80%",
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: 0,
    ...shadows.lg,
  },
  userText: {
    fontFamily: fontFamily.regular,
    color: colors.white,
  },
  userMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginRight: spacing.xs,
  },
  sponsorRow: {
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  sponsorBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "85%",
  },
  sponsorBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
  },
  sponsorBubble: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderBottomLeftRadius: 0,
    ...shadows.lg,
  },
  sponsorMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginLeft: 40, // align with bubble text (avatar 28 + margin 8 + bubble padding)
    alignSelf: "flex-start",
  },

  // ── Loading ──
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizeTokens.md,
    color: sem.textMuted,
    fontStyle: "italic",
  },

  // ── Input Bar ──
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    color: sem.text,
    backgroundColor: sem.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },

  // ── Error State ──
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: sem.background,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizeTokens.xl,
    marginBottom: spacing.md,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  errorButtonText: {
    fontFamily: fontFamily.semiBold,
    color: colors.white,
    fontSize: fontSizeTokens.lg,
  },
});
