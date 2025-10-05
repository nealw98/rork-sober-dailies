import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BigBookBookmark } from '@/hooks/useBigBookBookmarks';

interface BigBookBookmarksListProps {
  visible: boolean;
  onClose: () => void;
  bookmarks: BigBookBookmark[];
  onSelectBookmark: (bookmark: BigBookBookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
}

export default function BigBookBookmarksList({
  visible,
  onClose,
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
}: BigBookBookmarksListProps) {
  const handleRemoveBookmark = (bookmarkId: string) => {
    console.log('[BookmarkList] Removing bookmark:', bookmarkId);
    onRemoveBookmark(bookmarkId);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bookmarks</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {bookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookmarks yet</Text>
              <Text style={styles.emptySubtext}>
                Tap 📖 while reading to save pages
              </Text>
            </View>
          ) : (
            bookmarks.map((bookmark) => (
              <View key={bookmark.id} style={styles.bookmarkCard}>
                <TouchableOpacity
                  style={styles.bookmarkContent}
                  onPress={() => onSelectBookmark(bookmark)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pageNumber}>Page {bookmark.originalPageNumber}</Text>
                  <Text style={styles.chapterTitle}>{bookmark.chapterTitle}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveBookmark(bookmark.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.muted,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookmarkContent: {
    flex: 1,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 20,
  },
});

