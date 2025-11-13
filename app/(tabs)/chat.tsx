import React from "react";
import { StyleSheet, Platform } from "react-native";
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
import { ChevronLeft, Gem } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { SPONSORS } from "@/constants/sponsors";
import ScreenContainer from "@/components/ScreenContainer";
import { useState, useEffect } from "react";
import { PremiumComingSoonModal } from "@/components/PremiumComingSoonModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_TESTFLIGHT_PREVIEW } from "@/constants/featureFlags";

const PREMIUM_UNLOCKED_KEY = '@premium_sponsors_unlocked';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [selectedPremiumId, setSelectedPremiumId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'premium' | 'pickAnother'>('premium');
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);

  // Load premium unlock status from storage on mount
  useEffect(() => {
    loadPremiumUnlockStatus();
  }, []);

  const loadPremiumUnlockStatus = async () => {
    try {
      if (IS_TESTFLIGHT_PREVIEW) {
        await AsyncStorage.removeItem(PREMIUM_UNLOCKED_KEY);
        setPremiumUnlocked(false);
        return;
      }
      const stored = await AsyncStorage.getItem(PREMIUM_UNLOCKED_KEY);
      if (stored) {
        setPremiumUnlocked(JSON.parse(stored) === true);
      }
    } catch (error) {
      console.error('Failed to load premium unlock status:', error);
    }
  };

  const markAllPremiumAsUnlocked = async () => {
    try {
      setPremiumUnlocked(true);
      if (!IS_TESTFLIGHT_PREVIEW) {
        await AsyncStorage.setItem(PREMIUM_UNLOCKED_KEY, JSON.stringify(true));
      }
    } catch (error) {
      console.error('Failed to save premium unlock status:', error);
    }
  };

  const handleSponsorSelect = (sponsorId: string) => {
    const sponsor = SPONSORS.find(s => s.id === sponsorId);
    const isPremiumSponsor = sponsor?.isPremium;
    const isDeployed = !!(sponsor && sponsor.isAvailable);
    
    if (!isDeployed) {
      setModalMode('pickAnother');
      setSelectedPremiumId(sponsorId);
      setComingSoonVisible(true);
      return;
    }
    if (isPremiumSponsor && !premiumUnlocked) {
      setModalMode('premium');
      setSelectedPremiumId(sponsorId);
      setComingSoonVisible(true);
      return;
    }
    if (sponsor && sponsor.isAvailable) {
      router.push(`/sponsor-chat?sponsor=${sponsorId}`);
    } else {
      setComingSoonVisible(true);
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
            {SPONSORS.map((sponsor) => {
              const isLocked = sponsor.isPremium && !premiumUnlocked;
              return (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.card,
                    !sponsor.isAvailable && styles.cardDisabled,
                    isLocked && styles.cardLocked,
                  ]}
                  onPress={() => handleSponsorSelect(sponsor.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContent}>
                    {sponsor.isAvailable && sponsor.avatar ? (
                      <Image 
                        source={sponsor.avatar} 
                        style={[
                          styles.avatar,
                          isLocked && styles.avatarGrayed
                        ]} 
                      />
                    ) : (
                      <View style={styles.avatarLocked}>
                        <Text style={styles.lockEmoji}>🚧</Text>
                      </View>
                    )}
                    <View style={styles.textContent}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.sponsorName,
                            !sponsor.isAvailable && styles.textDisabled,
                          ]}
                        >
                          {sponsor.name}
                        </Text>
                        {sponsor.isPremium && isLocked && (
                          <View style={styles.premiumBadgeNameRight}>
                            <Gem size={18} color={Colors.light.tint} />
                          </View>
                        )}
                      </View>
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
              );
            })}
          </ScrollView>
        </LinearGradient>
        <PremiumComingSoonModal
          visible={comingSoonVisible}
          mode={modalMode}
          onClose={() => {
            const id = selectedPremiumId;
            const currentMode = modalMode;
            setComingSoonVisible(false);
            if (!id) return;
            if (currentMode === 'pickAnother') {
              // stay on list
            } else {
              // Unlock all premium sponsors
              markAllPremiumAsUnlocked();
              router.push(`/sponsor-chat?sponsor=${id}`);
            }
            setSelectedPremiumId(null);
          }}
        />
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
    alignSelf: "flex-start", // Prevent button from stretching across the header
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
    paddingTop: 40,
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
  cardLocked: {
    opacity: 0.65,
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
  avatarGrayed: {
    opacity: 0.5,
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
  textContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sponsorName: {
    fontSize: 20,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 6,
  },
  premiumBadgeNameRight: {
    marginLeft: 8,
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