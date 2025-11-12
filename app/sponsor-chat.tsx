import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatInterface from "@/components/ChatInterface";
import SponsorDropdown from "@/components/SponsorDropdown";
import { ChatStoreProvider, useChatStore } from "@/hooks/use-chat-store";
import { getSponsorById } from "@/constants/sponsors";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { SponsorType } from "@/types";

function SponsorChatContent({ initialSponsor }: { initialSponsor: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearChat } = useChatStore();
  const [currentSponsorId, setCurrentSponsorId] = useState<string>(initialSponsor);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
  });

  const sponsor = getSponsorById(currentSponsorId);

  const handleBack = () => {
    router.push("/(tabs)/chat");
  };

  const handleSponsorPress = (position: { x: number; y: number; width: number }) => {
    setDropdownPosition(position);
    setDropdownVisible(true);
  };

  const handleSponsorChange = (sponsorId: string) => {
    setCurrentSponsorId(sponsorId);
    router.setParams({ sponsor: sponsorId });
  };

  const handleRefresh = () => {
    clearChat();
  };

  if (!sponsor || !sponsor.isAvailable) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sponsor not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ChevronLeft color={Colors.light.tint} size={24} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <RotateCcw size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      {/* Chat Interface */}
      <ChatInterface
        sponsorType={currentSponsorId as SponsorType}
        onSponsorPress={handleSponsorPress}
      />

      {/* Dropdown */}
      <SponsorDropdown
        visible={dropdownVisible}
        currentSponsorId={currentSponsorId}
        onSelect={handleSponsorChange}
        onClose={() => setDropdownVisible(false)}
        dropdownPosition={dropdownPosition}
      />
    </View>
  );
}

export default function SponsorChatScreen() {
  const params = useLocalSearchParams<{ sponsor: string }>();
  const initialSponsor = params.sponsor || "supportive";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatStoreProvider>
        <SponsorChatContent initialSponsor={initialSponsor} />
      </ChatStoreProvider>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Platform.OS === "android" ? 4 : 8,
  },
  backText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '400',
  },
  refreshButton: {
    padding: Platform.OS === "android" ? 6 : 10,
    borderRadius: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: adjustFontWeight("600"),
  },
});

