/**
 * Big Book Highlights List Component
 * 
 * Modal/Bottom sheet showing all user highlights.
 * Tap highlight to navigate to that location in the reader.
 * 
 * Features:
 * - List all highlights with context
 * - Color indicators
 * - Notes preview
 * - Tap to navigate
 * - Empty state
 * - Delete highlights
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta, bigBookChapterMetadata } from '@/constants/bigbook-v2/metadata';
import { BigBookHighlight } from '@/types/bigbook-v2';

interface BigBookHighlightsListProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToHighlight: (chapterId: string, paragraphId: string) => void;
}

// A merged highlight group for display purposes
interface MergedHighlight {
  ids: string[];              // All highlight IDs in this group
  paragraphId: string;
  chapterId: string;
  color: string;
  combinedText: string;       // Combined text from all sentences
  note?: string;              // Note from first highlight with a note
  createdAt: number;          // Earliest createdAt
}

export function BigBookHighlightsList({
  visible,
  onClose,
  onNavigateToHighlight,
}: BigBookHighlightsListProps) {
  const { highlights, deleteHighlight, isLoading } = useBigBookHighlights();

  // Group highlights by chapter, then merge consecutive sentences within same paragraph
  const groupedHighlights = useMemo(() => {
    const groups: Record<string, MergedHighlight[]> = {};
    
    // First, group all highlights by chapter
    const byChapter: Record<string, BigBookHighlight[]> = {};
    highlights.forEach(highlight => {
      if (!byChapter[highlight.chapterId]) {
        byChapter[highlight.chapterId] = [];
      }
      byChapter[highlight.chapterId].push(highlight);
    });
    
    // For each chapter, merge consecutive highlights in same paragraph
    Object.entries(byChapter).forEach(([chapterId, chapterHighlights]) => {
      // Sort by paragraph, then by sentence index
      const sorted = [...chapterHighlights].sort((a, b) => {
        if (a.paragraphId !== b.paragraphId) {
          return a.paragraphId.localeCompare(b.paragraphId);
        }
        return a.sentenceIndex - b.sentenceIndex;
      });
      
      const merged: MergedHighlight[] = [];
      let currentGroup: BigBookHighlight[] = [];
      
      sorted.forEach((highlight, index) => {
        if (currentGroup.length === 0) {
          // Start new group
          currentGroup.push(highlight);
        } else {
          const lastInGroup = currentGroup[currentGroup.length - 1];
          // Check if this highlight is consecutive (same paragraph, next sentence index, same color)
          const isConsecutive = 
            highlight.paragraphId === lastInGroup.paragraphId &&
            highlight.sentenceIndex === lastInGroup.sentenceIndex + 1 &&
            highlight.color === lastInGroup.color;
          
          if (isConsecutive) {
            // Add to current group
            currentGroup.push(highlight);
          } else {
            // Finalize current group and start new one
            merged.push(createMergedHighlight(currentGroup));
            currentGroup = [highlight];
          }
        }
        
        // If last item, finalize current group
        if (index === sorted.length - 1 && currentGroup.length > 0) {
          merged.push(createMergedHighlight(currentGroup));
        }
      });
      
      // Sort merged highlights by paragraph order (book position)
      merged.sort((a, b) => {
        // Sort by paragraph ID (which contains order info like chapter-1-p1, chapter-1-p2)
        return a.paragraphId.localeCompare(b.paragraphId);
      });
      groups[chapterId] = merged;
    });
    
    return groups;
  }, [highlights]);
  
  // Get chapters sorted by book order
  const sortedChapterIds = useMemo(() => {
    const chapterOrder = bigBookChapterMetadata.map(m => m.id);
    return Object.keys(groupedHighlights).sort((a, b) => {
      const indexA = chapterOrder.indexOf(a);
      const indexB = chapterOrder.indexOf(b);
      // If not found in metadata, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [groupedHighlights]);
  
  // Helper to create a merged highlight from a group of consecutive highlights
  function createMergedHighlight(group: BigBookHighlight[]): MergedHighlight {
    // Combine text with space between sentences
    const combinedText = group.map(h => h.textSnapshot).join(' ');
    // Find the first note
    const note = group.find(h => h.note)?.note;
    // Use earliest createdAt
    const createdAt = Math.min(...group.map(h => h.createdAt));
    
    return {
      ids: group.map(h => h.id),
      paragraphId: group[0].paragraphId,
      chapterId: group[0].chapterId,
      color: group[0].color,
      combinedText,
      note,
      createdAt,
    };
  }
  
  // Count total merged entries for display
  const totalMergedCount = useMemo(() => {
    return Object.values(groupedHighlights).reduce((sum, arr) => sum + arr.length, 0);
  }, [groupedHighlights]);

  // Delete all highlights in a merged group
  const handleDeleteMerged = async (ids: string[]) => {
    try {
      console.log('[BigBookHighlightsList] Deleting merged highlights:', ids);
      // Delete all highlights in the group
      await Promise.all(ids.map(id => deleteHighlight(id)));
    } catch (error) {
      console.error('[BigBookHighlightsList] Error deleting highlights:', error);
    }
  };

  const handleNavigate = (chapterId: string, paragraphId: string) => {
    console.log('[BigBookHighlightsList] handleNavigate called');
    console.log('[BigBookHighlightsList] - chapterId:', chapterId);
    console.log('[BigBookHighlightsList] - paragraphId:', paragraphId);
    console.log('[BigBookHighlightsList] - onNavigateToHighlight type:', typeof onNavigateToHighlight);
    
    try {
      onNavigateToHighlight(chapterId, paragraphId);
      console.log('[BigBookHighlightsList] - onNavigateToHighlight called successfully');
      onClose();
      console.log('[BigBookHighlightsList] - onClose called successfully');
    } catch (error) {
      console.error('[BigBookHighlightsList] Error in handleNavigate:', error);
    }
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
          <Text style={styles.headerTitle}>My Highlights</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {totalMergedCount === 0 ? (
            // Empty State
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>✏️</Text>
              <Text style={styles.emptyStateTitle}>No Highlights Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Long-press and select text in the Big Book to create your first highlight.
              </Text>
              <Text style={styles.emptyStateHint}>
                Highlights help you remember important passages and insights.
              </Text>
            </View>
          ) : (
            // Highlights List
            <>
              <Text style={styles.countText}>
                {totalMergedCount} highlight{totalMergedCount !== 1 ? 's' : ''}
              </Text>
              
              {sortedChapterIds.map(chapterId => {
                const mergedHighlights = groupedHighlights[chapterId];
                const chapterMeta = getChapterMeta(chapterId);
                
                return (
                  <View key={chapterId} style={styles.chapterGroup}>
                    <Text style={styles.chapterTitle}>{chapterMeta?.title || chapterId}</Text>
                    
                    {mergedHighlights.map(merged => {
                      const key = merged.ids.join('-');
                      
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.highlightItem}
                          onPress={() => {
                            handleNavigate(merged.chapterId, merged.paragraphId);
                          }}
                          activeOpacity={0.7}
                        >
                        {/* Color Indicator */}
                        <View style={styles.colorIndicator} />
                        
                        <View style={styles.highlightContent}>
                          {/* Highlighted Text (combined from consecutive sentences) */}
                          <Text style={styles.highlightText}>
                            {merged.combinedText}
                          </Text>
                          
                          {/* Note (if exists) */}
                          {merged.note && (
                            <View style={styles.noteContainer}>
                              <Text style={styles.noteLabel}>Note:</Text>
                              <Text style={styles.noteText}>{merged.note}</Text>
                            </View>
                          )}
                          
                          {/* Metadata */}
                          <View style={styles.metadata}>
                            <Text style={styles.metadataText}>
                              {new Date(merged.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteMerged(merged.ids)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={18} color={Colors.light.muted} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                      );
                    })}
                  </View>
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
    fontSize: 24,
    fontWeight: adjustFontWeight('400'),
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
  chapterGroup: {
    marginBottom: 24,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: '#3D8B8B',
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
  },
  colorIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
    backgroundColor: '#3D8B8B',
  },
  highlightContent: {
    flex: 1,
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.text,
    marginBottom: 8,
  },
  noteContainer: {
    backgroundColor: Colors.light.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

