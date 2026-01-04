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
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';

interface BigBookHighlightsListProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToHighlight: (chapterId: string, paragraphId: string) => void;
}


export function BigBookHighlightsList({
  visible,
  onClose,
  onNavigateToHighlight,
}: BigBookHighlightsListProps) {
  const { highlights, deleteHighlight, isLoading } = useBigBookHighlights();

  // Group highlights by chapter
  const groupedHighlights = useMemo(() => {
    const groups: Record<string, typeof highlights> = {};
    
    highlights.forEach(highlight => {
      if (!groups[highlight.chapterId]) {
        groups[highlight.chapterId] = [];
      }
      groups[highlight.chapterId].push(highlight);
    });
    
    return groups;
  }, [highlights]);

  const handleDelete = async (highlightId: string) => {
    try {
      console.log('[BigBookHighlightsList] Deleting highlight:', highlightId);
      await deleteHighlight(highlightId);
    } catch (error) {
      console.error('[BigBookHighlightsList] Error deleting highlight:', error);
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
          {highlights.length === 0 ? (
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
                {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
              </Text>
              
              {Object.entries(groupedHighlights).map(([chapterId, chapterHighlights]) => {
                const chapterMeta = getChapterMeta(chapterId);
                
                return (
                  <View key={chapterId} style={styles.chapterGroup}>
                    <Text style={styles.chapterTitle}>{chapterMeta?.title || chapterId}</Text>
                    
                    {chapterHighlights.map(highlight => {
                      console.log('[BigBookHighlightsList] Rendering highlight:', {
                        id: highlight.id,
                        chapterId: highlight.chapterId,
                        paragraphId: highlight.paragraphId,
                      });
                      
                      return (
                        <TouchableOpacity
                          key={highlight.id}
                          style={styles.highlightItem}
                          onPress={() => {
                            console.log('[BigBookHighlightsList] TouchableOpacity pressed for highlight:', highlight.id);
                            handleNavigate(highlight.chapterId, highlight.paragraphId);
                          }}
                          activeOpacity={0.7}
                        >
                        {/* Color Indicator */}
                        <View style={styles.colorIndicator} />
                        
                        <View style={styles.highlightContent}>
                          {/* Highlighted Text (no quotes) */}
                          <Text style={styles.highlightText}>
                            {highlight.textSnapshot}
                          </Text>
                          
                          {/* Note (if exists) */}
                          {highlight.note && (
                            <View style={styles.noteContainer}>
                              <Text style={styles.noteLabel}>Note:</Text>
                              <Text style={styles.noteText}>{highlight.note}</Text>
                            </View>
                          )}
                          
                          {/* Metadata */}
                          <View style={styles.metadata}>
                            <Text style={styles.metadataText}>
                              {new Date(highlight.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(highlight.id)}
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

