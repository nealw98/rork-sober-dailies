import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Trash2 } from "lucide-react-native";
import Colors from "@/constants/colors";
import { adjustFontWeight } from "@/constants/fonts";
import { useDailyReflectionBookmarks } from "@/hooks/use-daily-reflection-bookmarks";

type SavedReflectionsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export default function SavedReflectionsModal({
  visible,
  onClose,
  onSelect,
}: SavedReflectionsModalProps) {
  const { bookmarks, removeBookmark } = useDailyReflectionBookmarks();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.card}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Saved Reflections</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {bookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No saved reflections yet</Text>
              <Text style={styles.emptyBody}>
                Tap the bookmark icon to save a day for quick access.
              </Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    onSelect(item.id);
                  }}
                >
                  <View style={styles.rowAccent} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowDate}>{item.displayDate}</Text>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeBookmark(item.id)}
                    style={styles.deleteButton}
                    hitSlop={8}
                  >
                    <Trash2 size={18} color={Colors.light.muted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: adjustFontWeight("700"),
    color: Colors.light.text,
  },
  doneText: {
    fontSize: 15,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.tint,
  },
  emptyState: {
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.text,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: "center",
  },
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(47, 94, 166, 0.06)", // light tint wash
    borderRadius: 12,
    padding: 10,
  },
  rowAccent: {
    width: 4,
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    fontSize: 13,
    color: Colors.light.muted,
    fontWeight: adjustFontWeight("600"),
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: adjustFontWeight("700"),
    color: Colors.light.tint,
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.divider,
    opacity: 0.5,
    marginVertical: 8,
  },
});

