import React from "react";
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";

interface BetaInviteModalProps {
  visible: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}

const BetaInviteModal: React.FC<BetaInviteModalProps> = ({ visible, onJoin, onDismiss }) => {
  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Sober Dailies 2.0 is Coming</Text>
          <Text style={styles.body}>
            This is the final free update for this version. You can keep using it as long
            as you want, but it won't receive any new features.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.emphasis}>Want the new version for FREE?</Text>
          </Text>
          <Text style={styles.body}>
            Help me test Sober Dailies 2.0 for 14 days and I'll send you a free download
            code for the new paid app (a $4.99 value).
          </Text>
          <Text style={styles.body}>
            When you tap the button below, you'll see a page that says "Sober Dailies Pro
            Testers" at the top. Just click the blue "Join group" button next to the
            group name, then follow the welcome instructions.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onJoin} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Join Testing Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: adjustFontWeight("600"),
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 18,
    color: "#4b5563",
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: adjustFontWeight("600"),
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: adjustFontWeight("500"),
  },
  emphasis: {
    fontWeight: adjustFontWeight("600"),
  },
});

export default BetaInviteModal;
