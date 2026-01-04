/**
 * Big Book Bookmarks List Component
 * 
 * Modal/Bottom sheet showing all user bookmarks.
 * Tap bookmark to navigate to that location in the reader.
 * 
 * Features:
 * - List all bookmarks
 * - Chapter and page info
 * - Custom labels
 * - Tap to navigate
 * - Empty state
 * - Delete bookmarks
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';

interface BigBookBookmarksListProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToBookmark: (chapterId: string, pageNumber: number) => void;
  onBookmarksChanged?: () => void;
}

export function BigBookBookmarksList({
  visible,
  onClose,
  onNavigateToBookmark,
  onBookmarksChanged,
}: BigBookBookmarksListProps) {
  const { bookmarks, deleteBookmark, updateBookmarkLabel, isLoading, refresh } = useBigBookBookmarks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Ensure bookmarks are up-to-date whenever the modal becomes visible
  useEffect(() => {
    if (visible) {
      refresh().catch(err => console.error('[BigBookBookmarksList] Refresh error:', err));
    }
  }, [visible, refresh]);

  // Sort bookmarks by creation date (newest first)
  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookmarks]);

  const handleDelete = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId);
      // Notify parent that bookmarks changed
      onBookmarksChanged?.();
    } catch (error) {
      console.error('[BigBookBookmarksList] Error deleting bookmark:', error);
    }
  };

  const handleNavigate = (chapterId: string, pageNumber: number) => {
    onNavigateToBookmark(chapterId, pageNumber);
    onClose();
  };

  const handleStartEdit = (bookmarkId: string, currentLabel?: string) => {
    setEditingId(bookmarkId);
    setEditingText(currentLabel || '');
  };

  const handleFinishEdit = async (bookmarkId: string) => {
    if (editingText.trim() !== '') {
      try {
        await updateBookmarkLabel(bookmarkId, editingText.trim());
      } catch (error) {
        console.error('[BigBookBookmarksList] Error updating label:', error);
      }
    }
    setEditingId(null);
    setEditingText('');
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Teal Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookmarks</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {bookmarks.length === 0 ? (
            // Empty State
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📑</Text>
              <Text style={styles.emptyStateTitle}>No Bookmarks Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Tap the bookmark icon while reading to save the current page.
              </Text>
              <Text style={styles.emptyStateHint}>
                Bookmarks help you quickly return to important pages.
              </Text>
            </View>
          ) : (
            // Bookmarks List
            <>
              <Text style={styles.countText}>
                {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
              </Text>
              
              {sortedBookmarks.map(bookmark => {
                const chapterMeta = getChapterMeta(bookmark.chapterId);
                const isEditing = editingId === bookmark.id;
                
                return (
                  <TouchableOpacity
                    key={bookmark.id}
                    style={styles.bookmarkItem}
                    onPress={() => !isEditing && handleNavigate(bookmark.chapterId, bookmark.pageNumber)}
                    activeOpacity={0.7}
                    disabled={isEditing}
                  >
                    {/* Blue Line Indicator */}
                    <View style={styles.bookmarkIndicator} />
                    
                    <View style={styles.bookmarkContent}>
                      {/* Page Number - Small */}
                      <Text style={styles.bookmarkPageNumber}>
                        Page {bookmark.pageNumber}
                      </Text>
                      
                      {/* Chapter Title - Blue */}
                      <Text style={styles.chapterTitle}>
                        {chapterMeta?.title || bookmark.chapterId}
                      </Text>
                      
                      {/* Editable Label */}
                      {isEditing ? (
                        <TextInput
                          style={styles.bookmarkLabelInput}
                          value={editingText}
                          onChangeText={setEditingText}
                          onBlur={() => handleFinishEdit(bookmark.id)}
                          onSubmitEditing={() => handleFinishEdit(bookmark.id)}
                          placeholder="Add a note..."
                          placeholderTextColor={Colors.light.muted}
                          autoFocus
                          multiline
                        />
                      ) : (
                        bookmark.label && (
                          <TouchableOpacity onPress={() => handleStartEdit(bookmark.id, bookmark.label)}>
                            <Text style={styles.bookmarkLabel}>
                              {bookmark.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                    
                    {/* Delete Button */}
                    {!isEditing && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(bookmark.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color={Colors.light.muted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3D8B8B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 16,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    overflow: 'hidden',
  },
  bookmarkIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3D8B8B',
  },
  bookmarkContent: {
    flex: 1,
    paddingLeft: 12,
  },
  bookmarkPageNumber: {
    fontSize: 15,
    fontWeight: adjustFontWeight('400'),
    color: Colors.light.muted,
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: '#3D8B8B',
    marginBottom: 2,
  },
  bookmarkLabel: {
    fontSize: 14,
    fontWeight: adjustFontWeight('400'),
    color: Colors.light.text,
    lineHeight: 18,
  },
  bookmarkLabelInput: {
    fontSize: 14,
    fontWeight: adjustFontWeight('400'),
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    minHeight: 40,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

