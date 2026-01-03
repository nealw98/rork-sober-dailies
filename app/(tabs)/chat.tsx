import React from "react";
import { StyleSheet, Platform, Dimensions } from "react-native";
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
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { SPONSORS } from "@/constants/sponsors";
import ScreenContainer from "@/components/ScreenContainer";

const { width: screenWidth } = Dimensions.get("window");
const TILE_GAP = 12;
const GRID_PADDING = 20;
const TILE_WIDTH = (screenWidth - GRID_PADDING * 2 - TILE_GAP) / 2;

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSponsorSelect = (sponsorId: string) => {
    const sponsor = SPONSORS.find(s => s.id === sponsorId);
    if (sponsor && sponsor.isAvailable) {
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
          colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
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
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
          <Text style={styles.headerTitle}>Choose Your Sponsor</Text>
        </LinearGradient>

        {/* Off-white background content area */}
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {SPONSORS.map((sponsor) => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.tile,
                    sponsor.tileColor && { backgroundColor: sponsor.tileColor },
                    !sponsor.isAvailable && styles.tileDisabled,
                  ]}
                  onPress={() => handleSponsorSelect(sponsor.id)}
                  activeOpacity={0.7}
                  disabled={!sponsor.isAvailable}
                >
                  {sponsor.isAvailable && sponsor.avatar ? (
                    <Image 
                      source={sponsor.avatar} 
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarLocked}>
                      <Text style={styles.lockEmoji}>🚧</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.sponsorName,
                      !sponsor.isAvailable && styles.textDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {sponsor.name}
                  </Text>
                  <Text
                    style={[
                      styles.sponsorDescription,
                      !sponsor.isAvailable && styles.textDisabled,
                    ]}
                    numberOfLines={2}
                  >
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
  backButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight("400"),
    color: "#fff",
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: 'rgba(61, 139, 139, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: TILE_GAP,
    alignItems: "center",
  },
  tileDisabled: {
    opacity: 0.6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  avatarLocked: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  lockEmoji: {
    fontSize: 24,
  },
  sponsorName: {
    fontSize: 15,
    fontWeight: adjustFontWeight("600", true),
    color: '#000',
    marginBottom: 4,
    textAlign: "center",
  },
  sponsorDescription: {
    fontSize: 12,
    fontWeight: adjustFontWeight("400"),
    color: '#333',
    lineHeight: 16,
    textAlign: "center",
  },
  textDisabled: {
    color: Colors.light.muted,
  },
});
