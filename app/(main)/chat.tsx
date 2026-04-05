import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Image, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
// LinearGradient removed — using hero card instead
import { useRouter, useFocusEffect } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import TopLevelHeader from "@/components/navigation/TopLevelHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
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
        <View style={styles.cardInner}>
          {sponsor.avatar && (
            <Image
              source={sponsor.avatar}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.cardBody}>
            <Text style={[styles.cardName, { color: sem.text }]}>{sponsor.name}</Text>
            <Text style={[styles.cardDescription, { color: sem.textSecondary }]}>{sponsor.description}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer noPadding>
        <View style={[styles.container, { backgroundColor: sem.background }]}>
          <TopLevelHeader title="" />

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>AI COMPANION</Text>
              <Text style={styles.heroTitle}>Find Your Guide</Text>
              <Text style={styles.heroDescription}>
                Choose a sponsor that resonates with your recovery journey and personality.
              </Text>
            </View>

            {/* Sponsor cards — only render once data is loaded to prevent flicker */}
            {dataLoaded && (
              <View style={styles.cardsContainer}>
                {sortedSponsors.map((sponsor) => renderSponsorCard(sponsor))}
              </View>
            )}
          </ScrollView>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: cardColors.light.sponsor,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  heroLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.secondaryDark,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["4xl"],
    color: semanticColors.light.text,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: semanticColors.light.textSecondary,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
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

  // ── Section Label ──
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  cardInner: {
    borderRadius: radii.lg,
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
    fontFamily: fontFamily.bold,
    fontSize: fontSize["3xl"],
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
});
