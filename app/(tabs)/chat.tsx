import React, { useEffect, useCallback } from "react";
import { StyleSheet, Dimensions } from "react-native";
import { Stack } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { usePostHog } from 'posthog-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { adjustFontWeight } from "@/constants/fonts";
import { SPONSORS } from "@/constants/sponsors";
import ScreenContainer from "@/components/ScreenContainer";
import { logEvent } from "@/lib/usageLogger";
import { useScreenTimeTracking } from "@/hooks/useScreenTimeTracking";

const { width: screenWidth } = Dimensions.get("window");
const TILE_GAP = 20;
const GRID_PADDING = 20;
const TILE_WIDTH = (screenWidth - GRID_PADDING * 2 - TILE_GAP) / 2;
const FULL_WIDTH = screenWidth - GRID_PADDING * 2;

// Only show these sponsors on the selection page
const VISIBLE_SPONSOR_IDS = ["supportive", "salty", "grace", "cowboy-pete", "co-sign-sally", "fresh", "mama-jo"];

export default function ChatScreen() {
  const posthog = usePostHog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  
  useScreenTimeTracking('AI Sponsor Selection');

  useFocusEffect(
    useCallback(() => {
      posthog?.screen('AI Sponsor Selection');
    }, [posthog])
  );

  // Filter to only visible sponsors
  const visibleSponsors = SPONSORS.filter(s => VISIBLE_SPONSOR_IDS.includes(s.id));

  const handleSponsorSelect = (sponsorId: string) => {
    const sponsor = SPONSORS.find(s => s.id === sponsorId);
    if (sponsor && sponsor.isAvailable) {
      // Track in PostHog
      posthog?.capture('sponsor_selected', { 
        $screen_name: 'AI Sponsor',
        sponsor_id: sponsorId, 
        sponsor_name: sponsor.name 
      });
      
      // Track in Supabase
      logEvent('sponsor_selected', {
        screen: 'AI Sponsor',
        sponsor_id: sponsorId,
        sponsor_name: sponsor.name
      });
      
      router.push(`/sponsor-chat?sponsor=${sponsorId}`);
    }
  };

  const handleBack = () => {
    router.push("/(tabs)");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer noPadding={true}>
        {/* Gradient header block with back button */}
        <LinearGradient
          colors={palette.gradients.header as [string, string, ...string[]]}
          style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Top row with back button */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
            <ChevronLeft size={24} color={palette.headerText} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
        <Text style={[styles.headerTitle, { color: palette.headerText }]}>Choose Your Sponsor</Text>
        </LinearGradient>

        {/* Content area with sponsor-specific background */}
        <View style={[styles.container, palette.sponsorSelection && { backgroundColor: palette.sponsorSelection.background }]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Eddie - Full Width */}
            {visibleSponsors.filter(s => s.id === "supportive").map((sponsor) => (
              <TouchableOpacity
                key={sponsor.id}
                style={[
                  styles.tile,
                  styles.tileFullWidth,
                  styles.tileHorizontal,
                  // Use sponsor tileColor for Default theme, or gradient fill for Deep Sea
                  palette.sponsorSelection ? styles.tileWithGradient : (sponsor.tileColor && { backgroundColor: sponsor.tileColor }),
                ]}
                onPress={() => handleSponsorSelect(sponsor.id)}
                activeOpacity={0.7}
              >
                {palette.sponsorSelection && (
                  <LinearGradient
                    colors={palette.sponsorSelection.tileColor as [string, string, ...string[]]}
                    style={styles.tileGradientFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                {sponsor.avatar && (
                  <Image 
                    source={sponsor.avatar} 
                    style={styles.avatarLarge}
                  />
                )}
                <View style={styles.tileTextContainer}>
                  <Text style={styles.sponsorNameLeft} numberOfLines={1}>
                    {sponsor.name}
                  </Text>
                  <Text style={styles.sponsorDescriptionLeft} numberOfLines={2}>
                    {sponsor.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Row 2: Sam and Grace */}
            <View style={styles.row}>
              {visibleSponsors.filter(s => s.id === "salty" || s.id === "grace").map((sponsor) => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.tile,
                    styles.tileHalf,
                    palette.sponsorSelection ? styles.tileWithGradient : (sponsor.tileColor && { backgroundColor: sponsor.tileColor }),
                  ]}
                  onPress={() => handleSponsorSelect(sponsor.id)}
                  activeOpacity={0.7}
                >
                  {palette.sponsorSelection && (
                    <LinearGradient
                      colors={palette.sponsorSelection.tileColor as [string, string, ...string[]]}
                      style={styles.tileGradientFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  {sponsor.avatar && (
                    <Image 
                      source={sponsor.avatar} 
                      style={styles.avatar}
                    />
                  )}
                  <Text style={styles.sponsorName} numberOfLines={1}>
                    {sponsor.name}
                  </Text>
                  <Text style={styles.sponsorDescription} numberOfLines={2}>
                    {sponsor.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 3: Pete and Mama Jo */}
            <View style={styles.row}>
              {visibleSponsors.filter(s => s.id === "cowboy-pete" || s.id === "mama-jo").map((sponsor) => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.tile,
                    styles.tileHalf,
                    palette.sponsorSelection ? styles.tileWithGradient : (sponsor.tileColor && { backgroundColor: sponsor.tileColor }),
                  ]}
                  onPress={() => handleSponsorSelect(sponsor.id)}
                  activeOpacity={0.7}
                >
                  {palette.sponsorSelection && (
                    <LinearGradient
                      colors={palette.sponsorSelection.tileColor as [string, string, ...string[]]}
                      style={styles.tileGradientFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  {sponsor.avatar && (
                    <Image 
                      source={sponsor.avatar} 
                      style={styles.avatar}
                    />
                  )}
                  <Text style={styles.sponsorName} numberOfLines={1}>
                    {sponsor.name}
                  </Text>
                  <Text style={styles.sponsorDescription} numberOfLines={2}>
                    {sponsor.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 4: Freddie and Sally */}
            <View style={styles.row}>
              {["fresh", "co-sign-sally"].map(id => visibleSponsors.find(s => s.id === id)).filter(Boolean).map((sponsor) => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.tile,
                    styles.tileHalf,
                    palette.sponsorSelection ? styles.tileWithGradient : (sponsor.tileColor && { backgroundColor: sponsor.tileColor }),
                  ]}
                  onPress={() => handleSponsorSelect(sponsor.id)}
                  activeOpacity={0.7}
                >
                  {palette.sponsorSelection && (
                    <LinearGradient
                      colors={palette.sponsorSelection.tileColor as [string, string, ...string[]]}
                      style={styles.tileGradientFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  {sponsor.avatar && (
                    <Image 
                      source={sponsor.avatar} 
                      style={styles.avatar}
                    />
                  )}
                  <Text style={styles.sponsorName} numberOfLines={1}>
                    {sponsor.name}
                  </Text>
                  <Text style={styles.sponsorDescription} numberOfLines={2}>
                    {sponsor.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight("400"),
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tile: {
    backgroundColor: 'rgba(61, 139, 139, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: TILE_GAP,
    alignItems: "center",
  },
  tileWithGradient: {
    overflow: 'hidden',
  },
  tileGradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  tileFullWidth: {
    width: FULL_WIDTH,
  },
  tileHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  tileHalf: {
    width: TILE_WIDTH,
    height: TILE_WIDTH,
    justifyContent: "center",
  },
  tileTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  sponsorName: {
    fontSize: 20,
    fontWeight: adjustFontWeight("600", true),
    color: '#000',
    marginBottom: 4,
    textAlign: "center",
  },
  sponsorNameLeft: {
    fontSize: 22,
    fontWeight: adjustFontWeight("600", true),
    color: '#000',
    marginBottom: 4,
    textAlign: "left",
  },
  sponsorDescription: {
    fontSize: 14,
    fontWeight: adjustFontWeight("400"),
    color: '#000',
    lineHeight: 18,
    textAlign: "center",
  },
  sponsorDescriptionLeft: {
    fontSize: 14,
    fontWeight: adjustFontWeight("400"),
    color: '#000',
    lineHeight: 18,
    textAlign: "left",
  },
});
