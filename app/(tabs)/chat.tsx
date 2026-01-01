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
        {/* Header with back button */}
        <View style={[styles.topHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft color={Colors.light.tint} size={24} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Title section with gradient accent bar */}
        <View style={styles.titleSection}>
          <LinearGradient
            colors={['#4A90E2', '#50C878', '#4A90E2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientAccent}
          />
          <Text style={styles.headerTitle}>Choose Your Sponsor</Text>
        </View>

        {/* White background content area */}
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
  topHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Platform.OS === "android" ? 4 : 8,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '400',
  },
  titleSection: {
    backgroundColor: "#fff",
    paddingBottom: 20,
    alignItems: "center",
  },
  gradientAccent: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: adjustFontWeight("700", true),
    color: Colors.light.text,
    textAlign: "center",
    letterSpacing: -0.5,
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
