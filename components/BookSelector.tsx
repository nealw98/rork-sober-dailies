import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";

interface BookSelectorProps {
  activeBook: "bigbook" | "twelve";
}

export default function BookSelector({ activeBook }: BookSelectorProps) {
  const router = useRouter();

  const handleBookChange = (book: "bigbook" | "twelve") => {
    if (book !== activeBook) {
      if (book === "bigbook") {
        router.push("/bigbook");
      } else {
        router.push("/twelve-and-twelve");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[
            styles.toggleItem,
            styles.leftToggle,
            activeBook === "bigbook" && styles.activeToggle
          ]}
          onPress={() => handleBookChange("bigbook")}
          testID="bigbook-toggle"
        >
          <Text style={[
            styles.toggleText,
            activeBook === "bigbook" && styles.activeToggleText
          ]}>
            Big Book
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleItem,
            styles.rightToggle,
            activeBook === "twelve" && styles.activeToggle
          ]}
          onPress={() => handleBookChange("twelve")}
          testID="twelve-toggle"
        >
          <Text style={[
            styles.toggleText,
            activeBook === "twelve" && styles.activeToggleText
          ]}>
            12 & 12
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 24,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.divider,
    overflow: "hidden",
  },
  toggleItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  leftToggle: {
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  rightToggle: {
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.divider,
  },
  activeToggle: {
    backgroundColor: Colors.light.tint,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
  },
  activeToggleText: {
    color: "white",
    fontWeight: adjustFontWeight("600"),
  },
});