import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { SPONSORS, SponsorConfig } from "@/constants/sponsors";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";

interface SponsorDropdownProps {
  visible: boolean;
  currentSponsorId: string;
  onSelect: (sponsorId: string) => void;
  onClose: () => void;
  dropdownPosition: { x: number; y: number; width: number };
}

export default function SponsorDropdown({
  visible,
  currentSponsorId,
  onSelect,
  onClose,
  dropdownPosition,
}: SponsorDropdownProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (sponsor: SponsorConfig) => {
    if (!sponsor.isAvailable) return;
    onSelect(sponsor.id);
    onClose();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dropdown,
                {
                  top: dropdownPosition.y,
                  left: dropdownPosition.x,
                  width: dropdownPosition.width,
                  opacity: opacityAnim,
                  transform: [{ translateY }],
                },
              ]}
            >
              {SPONSORS.map((sponsor) => (
                <TouchableOpacity
                  key={sponsor.id}
                  style={[
                    styles.dropdownItem,
                    currentSponsorId === sponsor.id && styles.dropdownItemActive,
                    !sponsor.isAvailable && styles.dropdownItemDisabled,
                  ]}
                  onPress={() => handleSelect(sponsor)}
                  disabled={!sponsor.isAvailable}
                >
                  <View style={styles.dropdownItemContent}>
                    {sponsor.isAvailable && sponsor.avatar ? (
                      <Image
                        source={sponsor.avatar}
                        style={styles.dropdownAvatar}
                      />
                    ) : (
                      <View style={styles.dropdownAvatarLocked}>
                        <Text style={styles.lockEmoji}>🔒</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.dropdownItemText,
                        !sponsor.isAvailable && styles.dropdownItemTextDisabled,
                      ]}
                    >
                      {sponsor.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  dropdown: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: Colors.light.cardBackground,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  dropdownAvatarLocked: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: Colors.light.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  lockEmoji: {
    fontSize: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
  },
  dropdownItemTextDisabled: {
    color: Colors.light.muted,
  },
});




