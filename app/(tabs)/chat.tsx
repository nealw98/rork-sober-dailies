import React from "react";
import { StyleSheet } from "react-native";
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
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { SPONSORS } from "@/constants/sponsors";
import ScreenContainer from "@/components/ScreenContainer";

export default function ChatScreen() {
  const router = useRouter();

  const handleSponsorSelect = (sponsorId: string) => {
    router.push(`/sponsor-chat?sponsor=${sponsorId}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer noPadding={true}>
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
            {SPONSORS.map((sponsor) => (
              <TouchableOpacity
                key={sponsor.id}
                style={[
                  styles.card,
                  !sponsor.isAvailable && styles.cardDisabled,
                ]}
                onPress={() => handleSponsorSelect(sponsor.id)}
                disabled={!sponsor.isAvailable}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  {sponsor.isAvailable && sponsor.avatar ? (
                    <Image source={sponsor.avatar} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarLocked}>
                      <Text style={styles.lockEmoji}>🔒</Text>
                    </View>
                  )}
                  <View style={styles.textContent}>
                    <Text
                      style={[
                        styles.sponsorName,
                        !sponsor.isAvailable && styles.textDisabled,
                      ]}
                    >
                      {sponsor.name}
                    </Text>
                    <Text
                      style={[
                        styles.sponsorDescription,
                        !sponsor.isAvailable && styles.textDisabled,
                      ]}
                    >
                      {sponsor.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight("700", true),
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.muted,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarLocked: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  lockEmoji: {
    fontSize: 32,
  },
  textContent: {
    flex: 1,
  },
  sponsorName: {
    fontSize: 20,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 6,
  },
  sponsorDescription: {
    fontSize: 14,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.muted,
    lineHeight: 20,
  },
  textDisabled: {
    color: Colors.light.muted,
  },
});