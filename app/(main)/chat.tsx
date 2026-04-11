import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Image, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MessageCircle, Home, Menu } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useHamburgerMenu } from "@/hooks/useHamburgerMenu";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/hooks/useTheme";
import { SPONSORS, SponsorConfig } from "@/constants/sponsors";
import ScreenContainer from "@/components/ScreenContainer";
import { logEvent } from "@/lib/usageLogger";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";
import {
  colors,
  semanticColors,
  cardColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  shadows,
} from "@/constants/designTokens";
import CompassWatermark from "@/components/CompassWatermark";

// Only show these sponsors on the selection page
const VISIBLE_SPONSOR_IDS = [
  "supportive",
  "salty",
  "grace",
  "cowboy-pete",
  "co-sign-sally",
  "fresh",
  "mama-jo",
];

// Map sponsor IDs to their AsyncStorage message keys
const SPONSOR_STORAGE_KEYS: Record<string, string> = {
  "supportive": "aa-chat-messages-supportive",
  "salty": "aa-chat-messages-salty",
  "grace": "aa-chat-messages-grace",
  "cowboy-pete": "aa-chat-messages-cowboy",
  "co-sign-sally": "aa-chat-messages-sally",
  "fresh": "aa-chat-messages-fresh",
  "mama-jo": "aa-chat-messages-mama-jo",
};

const GRADIENT_COLORS = ["#4A6FA5", "#3D8B8B", "#45A08A", "#F2F6F5"] as const;
const GRADIENT_LOCATIONS = [0, 0.12, 0.25, 0.45] as const;

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { open } = useHamburgerMenu();
  const sem = semanticColors.light;
  const [lastUsedSponsorId, setLastUsedSponsorId] = useState<string | null>(null);
  const [activeChats, setActiveChats] = useState<Set<string>>(new Set());
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [frozenOrder, setFrozenOrder] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const cardPositions = useRef<Record<string, number>>({});
  const hasLoadedInitialOrder = useRef(false);

  const scrollRef = useRef<ScrollView>(null);

  useScreenTimeTracking("AI Sponsor Selection");

  // On first mount (app launch): compute and freeze the sort order
  useEffect(() => {
    const loadInitialOrder = async () => {
      try {
        const storedCounts = await AsyncStorage.getItem("aa-sponsor-usage-counts");
        let counts: Record<string, number> = {};
        if (storedCounts) {
          try { counts = JSON.parse(storedCounts); } catch { /* ignore */ }
        }
        setUsageCounts(counts);

        // Compute sort order once and freeze it for this session
        const sorted = [...VISIBLE_SPONSOR_IDS].sort((a, b) => {
          const aCount = counts[a] || 0;
          const bCount = counts[b] || 0;
          if (bCount !== aCount) return bCount - aCount;
          return a.localeCompare(b);
        });
        setFrozenOrder(sorted);
        hasLoadedInitialOrder.current = true;
      } catch (error) {
        console.error("Error loading initial order:", error);
        setFrozenOrder(VISIBLE_SPONSOR_IDS);
        hasLoadedInitialOrder.current = true;
      }
    };
    loadInitialOrder();
  }, []);

  // On every focus: refresh last-used and active chats (but NOT the order)
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          const [lastUsed, ...messageResults] = await Promise.all([
            AsyncStorage.getItem("aa-chat-sponsor-type"),
            ...Object.values(SPONSOR_STORAGE_KEYS).map((key) =>
              AsyncStorage.getItem(key)
            ),
          ]);

          // Build active chats set
          const active = new Set<string>();
          const sponsorIds = Object.keys(SPONSOR_STORAGE_KEYS);
          messageResults.forEach((messages, index) => {
            if (messages) {
              try {
                const parsed = JSON.parse(messages);
                if (Array.isArray(parsed) && parsed.length > 1) {
                  active.add(sponsorIds[index]);
                }
              } catch { /* ignore */ }
            }
          });

          setLastUsedSponsorId(lastUsed);
          setActiveChats(active);
          setDataLoaded(true);

          // Scroll to the last-used sponsor's card
          if (lastUsed && cardPositions.current[lastUsed] !== undefined) {
            setTimeout(() => {
              scrollRef.current?.scrollTo({
                y: cardPositions.current[lastUsed],
                animated: false,
              });
            }, 50);
          }
        } catch (error) {
          console.error("Error refreshing sponsor data:", error);
          setDataLoaded(true);
        }
      };
      refreshData();
    }, [])
  );

  const visibleSponsors = SPONSORS.filter((s) =>
    VISIBLE_SPONSOR_IDS.includes(s.id)
  );

  // Use the frozen order from app launch — never changes mid-session
  const sortedSponsors = frozenOrder
    .map((id) => visibleSponsors.find((s) => s.id === id))
    .filter(Boolean) as typeof visibleSponsors;

  const handleSponsorSelect = async (sponsorId: string) => {
    const sponsor = SPONSORS.find((s) => s.id === sponsorId);
    if (sponsor && sponsor.isAvailable) {
      logEvent("sponsor_selected", {
        screen: "AI Sponsor",
        sponsor_id: sponsorId,
        sponsor_name: sponsor.name,
      });

      // Increment usage count
      const newCounts = { ...usageCounts, [sponsorId]: (usageCounts[sponsorId] || 0) + 1 };
      setUsageCounts(newCounts);
      AsyncStorage.setItem("aa-sponsor-usage-counts", JSON.stringify(newCounts)).catch(() => {});

      router.push(`/sponsor-chat?sponsor=${sponsorId}`);
    }
  };

  const renderSponsorCard = (sponsor: SponsorConfig) => {
    return (
      <TouchableOpacity
        key={sponsor.id}
        style={styles.card}
        onPress={() => handleSponsorSelect(sponsor.id)}
        activeOpacity={0.85}
        onLayout={(e) => {
          cardPositions.current[sponsor.id] = e.nativeEvent.layout.y;
        }}
      >
        <BlurView intensity={60} tint="extraLight" style={styles.cardBlur}>
          <View style={styles.cardInner}>
            {sponsor.avatar && (
              <Image
                source={sponsor.avatar}
                style={styles.cardImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{sponsor.name}</Text>
              <Text style={styles.cardDescription}>{sponsor.description}</Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer noPadding>
        <View style={styles.container}>
          {/* ── Floating Frosted Pill Nav ── */}
          <View style={[styles.pillWrapper, { top: insets.top + 8 }]}>
            <BlurView intensity={40} tint="extraLight" style={styles.pillBar}>
              <View style={styles.pillBorderOverlay} />
              <TouchableOpacity onPress={() => router.push('/(main)/')} style={styles.pillBtn} activeOpacity={0.7}>
                <Home size={20} color="#1A1A2E" strokeWidth={1.5} />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity onPress={open} style={styles.pillBtn} activeOpacity={0.7}>
                <Menu size={20} color="#1A1A2E" strokeWidth={1.5} />
              </TouchableOpacity>
            </BlurView>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Full-page Gradient Wrapper ── */}
            <View style={styles.gradientPage}>
              <LinearGradient
                colors={GRADIENT_COLORS as unknown as string[]}
                locations={GRADIENT_LOCATIONS as unknown as number[]}
                style={styles.gradientBackground}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
              />

              <CompassWatermark />

              {/* ── Editorial Header ── */}
              <View style={[styles.pageIntro, { paddingTop: insets.top + 100 }]}>
                <View style={styles.introLabelRow}>
                  <MessageCircle size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.introLabel}>AI SPONSOR</Text>
                </View>
                <Text style={styles.introTitle}>Find Your Guide</Text>
                <Text style={styles.introDescription}>
                  Choose a sponsor that resonates with your recovery journey and personality.
                </Text>
              </View>

              {/* Sponsor cards — only render once data is loaded to prevent flicker */}
              {dataLoaded && (
                <View style={styles.cardsContainer}>
                  {sortedSponsors.map((sponsor) => renderSponsorCard(sponsor))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // ── Gradient Page ──
  gradientPage: {
    minHeight: "100%",
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Frosted Pill Nav ──
  pillWrapper: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  pillBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 9999,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    overflow: "hidden",
  },
  pillBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  pillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Editorial Page Intro ──
  pageIntro: {
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: spacing.xl,
  },
  introLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  introLabel: {
    fontFamily: "WixMadeforDisplay_600SemiBold",
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.7)",
  },
  introTitle: {
    fontFamily: "WixMadeforDisplay_700Bold",
    fontSize: fontSize["4xl"],
    marginBottom: spacing.sm,
    color: colors.white,
  },
  introDescription: {
    fontFamily: "WixMadeforText_400Regular",
    fontSize: fontSize.md,
    lineHeight: 20,
    color: "rgba(255,255,255,0.8)",
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  cardsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // ── Frosted Glass Card ──
  card: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  cardInner: {
    borderRadius: 24,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 280,
  },
  cardBody: {
    padding: spacing.lg,
  },
  cardName: {
    fontFamily: "WixMadeforDisplay_700Bold",
    fontSize: fontSize["3xl"],
    marginBottom: spacing.xs,
    color: "#1A1A2E",
  },
  cardDescription: {
    fontFamily: "WixMadeforText_400Regular",
    fontSize: fontSize.md,
    lineHeight: 20,
    color: "#6B7280",
  },
});
