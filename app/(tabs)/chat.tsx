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
const CARD_GAP = 12;
const GRID_PADDING = 20;
const CARD_WIDTH = (screenWidth - GRID_PADDING * 2 - CARD_GAP) / 2;

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
          colors={['#5A82AB', '#6B9CA3', '#7FB3A3']}
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
              <ChevronLeft color="#fff" size={20} />
              <Text style={styles.backButtonText}>Back</Text>
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
                    styles.card,
                    !sponsor.isAvailable && styles.cardDisabled,
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
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: adjustFontWeight("400"),
    color: "#fff",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    padding: 12,
    marginBottom: CARD_GAP + 8,
    alignItems: "center",
  },
  cardDisabled: {
    opacity: 0.6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLocked: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  lockEmoji: {
    fontSize: 28,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  sponsorDescription: {
    fontSize: 13,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.muted,
    lineHeight: 18,
    textAlign: "center",
  },
  textDisabled: {
    color: Colors.light.muted,
  },
});
