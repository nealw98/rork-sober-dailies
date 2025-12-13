import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Type } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useTextSettings } from "@/hooks/use-text-settings";
import { adjustFontWeight } from "@/constants/fonts";

type TextSettingsButtonProps = {
  compact?: boolean;
};

const TextSettingsModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const {
    fontSize,
    lineHeight,
    setFontSize,
    resetDefaults,
    minFontSize,
    maxFontSize,
  } = useTextSettings();

  const step = 2;

  const increase = () => setFontSize(fontSize + step);
  const decrease = () => setFontSize(fontSize - step);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.modalCard}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetDefaults} hitSlop={12}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Text size</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.resetText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.preview}>
            <Text style={[styles.previewLabel, { fontSize: 14 }]}>Preview</Text>
            <Text
              style={[
                styles.previewText,
                { fontSize, lineHeight, fontWeight: adjustFontWeight("500"), textAlign: "center" },
              ]}
            >
              “Daily progress one day at a time.”
            </Text>
            <Text style={styles.previewMeta}>{`Size ${fontSize}`}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={decrease}
              disabled={fontSize <= minFontSize}
              hitSlop={12}
            >
              <Text style={styles.buttonLabel}>Smaller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleButton}
              onPress={increase}
              disabled={fontSize >= maxFontSize}
              hitSlop={12}
            >
              <Text style={styles.buttonLabel}>Larger</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const TextSettingsButton = ({ compact = false }: TextSettingsButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.trigger, compact && styles.triggerCompact]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.triggerText}>Aa</Text>
      </TouchableOpacity>
      <TextSettingsModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default TextSettingsButton;

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: "transparent",
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 0,
    marginRight: Platform.OS === "ios" ? 16 : 12,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerCompact: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  triggerText: {
    fontSize: 20,
    fontWeight: adjustFontWeight("400"),
    color: Colors.light.tint,
    lineHeight: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("700"),
    color: Colors.light.text,
  },
  resetText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: adjustFontWeight("600"),
  },
  preview: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  previewLabel: {
    color: Colors.light.muted,
    fontSize: 12,
    fontWeight: adjustFontWeight("600"),
  },
  previewText: {
    color: Colors.light.text,
  },
  previewMeta: {
    fontSize: 12,
    color: Colors.light.muted,
    marginTop: 2,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.text,
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeText: {
    color: Colors.light.tint,
    fontSize: 15,
    fontWeight: adjustFontWeight("600"),
  },
});

