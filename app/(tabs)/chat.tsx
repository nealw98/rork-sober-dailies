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
const GRID_PADDING = 16;
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
        <View style={[styles.whiteHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft color={Colors.light.tint} size={24} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={Colors.gradients.mainThreeColor}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Your Sponsor</Text>
            <Text style={styles.headerSubtitle}>
              Select a sponsor that fits your style
            </Text>
          </View>

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
        </LinearGradient>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  whiteHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
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
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: adjustFontWeight("700", true),
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.muted,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    padding: 16,
    marginBottom: CARD_GAP + 8,
    alignItems: "center",
  },
  cardDisabled: {
    opacity: 0.6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLocked: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  lockEmoji: {
    fontSize: 28,
  },
  sponsorName: {
    fontSize: 17,
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
