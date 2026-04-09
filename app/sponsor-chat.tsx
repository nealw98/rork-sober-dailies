import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ChevronLeft, RotateCcw, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
const HERO_HEIGHT = Dimensions.get("window").height * 0.35;
const STICKY_THRESHOLD = HERO_HEIGHT - 80;

type LimitCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "daily" | "monthly"; count: number }
  | { allowed: false; error: string };

const checkSponsorMessageLimits = async (): Promise<LimitCheckResult> => {
  try {
    const anonymousId = await getAnonymousId();
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const { count: dailyCount, error: dailyError } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("anonymous_id", anonymousId)
      .like("feature", "SponsorMessage_%")
      .gte("created_at", startOfDay.toISOString());
    if (dailyError) return { allowed: false, error: dailyError.message };
    if ((dailyCount ?? 0) >= DAILY_SPONSOR_LIMIT)
      return { allowed: false, reason: "daily", count: dailyCount ?? 0 };

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("anonymous_id", anonymousId)
      .like("feature", "SponsorMessage_%")
      .gte("created_at", startOfMonth.toISOString());
    if (monthlyError) return { allowed: false, error: monthlyError.message };
    if ((monthlyCount ?? 0) >= MONTHLY_SPONSOR_LIMIT)
      return { allowed: false, reason: "monthly", count: monthlyCount ?? 0 };

    return { allowed: true };
  } catch (error: any) {
    return { allowed: true };
  }
};

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

const sem = semanticColors.light;

const ChatMessage_View = ({
  message,
  sponsorType,
  fontSize,
}: {
  message: ChatMessage;
  sponsorType: SponsorType;
  fontSize: number;
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

  const isWelcome = message.id.startsWith("welcome-");
  const timeString = isWelcome
    ? ""
    : new Date(message.timestamp)
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toUpperCase();

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
        {timeString ? <Text style={styles.userMeta}>{timeString}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.sponsorRow}>
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={0.9}
        style={styles.sponsorBubble}
      >
        <ChatMarkdownRenderer
          content={message.text}
          style={{ color: "#1A3A4A", fontSize, fontFamily: "WixMadeforText_400Regular" }}
        />
      </TouchableOpacity>
      {timeString ? <Text style={styles.sponsorMeta}>{timeString}</Text> : null}
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
  const scrollY = useRef(new Animated.Value(0)).current;

  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD - 40, STICKY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const targetSponsor = initialSponsor as SponsorType;
    if (targetSponsor !== sponsorType) {
      changeSponsor(targetSponsor);
    }
  }, [initialSponsor, sponsorType, changeSponsor]);

  const sponsor = getSponsorById(initialSponsor as SponsorType);
  const screenName = sponsor?.name || "Unknown Sponsor";
  useScreenTimeTracking(screenName);

  const placeholderText = sponsor?.chatPlaceholder ?? sponsor?.placeholderText ?? "Type a message...";
  const loadingText = sponsor?.loadingText ?? "Thinking...";

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleBack = () => router.back();

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
        <Text style={[styles.errorText, { color: sem.text }]}>Sponsor not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSendDisabled = !inputText.trim() || isLoading || isCheckingLimits;
  const chatMessages = messages.filter((m) => !m.id.startsWith("welcome-"));

  const renderHeroHeader = () => (
    <View>
      {/* ── Hero Image ── */}
      <View style={styles.heroContainer}>
        <Image source={sponsor.avatar} style={styles.heroImage} resizeMode="cover" />

        {/* Top gradient — ensures nav buttons visible on any photo */}
        <LinearGradient
          colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.1)", "transparent"]}
          locations={[0, 0.5, 1]}
          style={styles.heroTopGradient}
        />

        {/* Bottom gradient — seamless fade into #F8F9FA */}
        <LinearGradient
          colors={["transparent", "transparent", "#F8F9FA"]}
          locations={[0, 0.5, 1]}
          style={styles.heroBottomGradient}
        />

        {/* Nav buttons */}
        <View style={[styles.heroNavRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.heroNavBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color="rgba(255,255,255,0.85)" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh} style={styles.heroNavBtn} activeOpacity={0.7}>
            <RotateCcw size={18} color="rgba(255,255,255,0.85)" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Name + Tags at bottom of image */}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroName}>{sponsor.name}</Text>
          {sponsor.tags && (
            <View style={styles.tagsRow}>
              {sponsor.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── Hook Quote ── */}
      {sponsor.hookQuote && (
        <View style={styles.hookQuoteContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.hookQuoteText}>
            {`\u201C${sponsor.hookQuote}\u201D`}
          </Text>
          <View style={styles.separatorLine} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Sticky Compact Header ── */}
      <Animated.View
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top + 8, opacity: stickyOpacity },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.stickyBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#1A3A4A" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.stickyName}>{sponsor.name}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.stickyBtn} activeOpacity={0.7}>
          <RotateCcw size={16} color={sem.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Chat ── */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage_View
              message={item}
              sponsorType={initialSponsor as SponsorType}
              fontSize={fontSize}
            />
          )}
          ListHeaderComponent={renderHeroHeader}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={sem.textMuted} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
            style={[styles.sendBtn, isSendDisabled && styles.sendBtnDisabled]}
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
    backgroundColor: "#F8F9FA",
  },

  // ── Hero ──
  heroContainer: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroBottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.5,
  },
  heroNavRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  heroNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroName: {
    fontFamily: "WixMadeforDisplay_700Bold",
    fontSize: 28,
    color: "#1A3A4A",
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  tagPill: {
    backgroundColor: "rgba(168, 222, 222, 0.15)",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: "WixMadeforText_500Medium",
    fontSize: 10,
    letterSpacing: 1,
    color: "#1A3A4A",
    textTransform: "uppercase",
  },

  // ── Hook Quote ──
  hookQuoteContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  hookQuoteText: {
    fontFamily: "WixMadeforText_400Regular_Italic",
    fontSize: fontSizeTokens.md,
    color: "#1A3A4A",
    textAlign: "center",
    lineHeight: 22,
    paddingVertical: spacing.md,
  },
  separatorLine: {
    width: 40,
    height: 0.5,
    backgroundColor: "#E5E2D9",
  },

  // ── Sticky Header ──
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E2D9",
  },
  stickyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyName: {
    fontFamily: "WixMadeforDisplay_600SemiBold",
    fontSize: fontSizeTokens.lg,
    color: "#1A3A4A",
  },

  // ── Chat Area ──
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // ── Bubbles ──
  userRow: {
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  userBubble: {
    backgroundColor: "#EAF2F2",
    padding: spacing.md,
    maxWidth: "85%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: {
    fontFamily: "WixMadeforText_400Regular",
    color: "#1A3A4A",
  },
  userMeta: {
    fontFamily: "WixMadeforText_400Regular",
    fontSize: 10,
    color: sem.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  sponsorRow: {
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  sponsorBubble: {
    backgroundColor: "#F0F0F0",
    padding: spacing.md,
    maxWidth: "85%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  sponsorMeta: {
    fontFamily: "WixMadeforText_400Regular",
    fontSize: 10,
    color: sem.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
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
    fontFamily: "WixMadeforText_400Regular_Italic",
    fontSize: fontSizeTokens.md,
    color: sem.textMuted,
  },

  // ── Input Bar ──
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: "#F8F9FA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E2D9",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: "WixMadeforText_400Regular",
    color: "#1A3A4A",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A3A4A",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  errorText: {
    fontFamily: "WixMadeforText_500Medium",
    fontSize: fontSizeTokens.xl,
    marginBottom: spacing.md,
  },
  errorButton: {
    backgroundColor: "#1A3A4A",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  errorButtonText: {
    fontFamily: "WixMadeforText_600SemiBold",
    color: colors.white,
    fontSize: fontSizeTokens.lg,
  },
});
