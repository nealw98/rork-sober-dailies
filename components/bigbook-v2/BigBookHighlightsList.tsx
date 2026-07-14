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
  Pressable,
  Modal,
} from 'react-native';
import { X, Trash2, Highlighter } from 'lucide-react-native';
import { useReadingSize } from '@/hooks/use-reading-size';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta, bigBookChapterMetadata } from '@/constants/bigbook-v2/metadata';
import { bigBookContent } from '@/constants/bigbook-v2/content';
import { BigBookHighlight } from '@/types/bigbook-v2';
import { parseMarkdownItalics } from './markdownUtils';
import { fontFamily, type Tokens } from '@/constants/designTokens';
import { readerSerif } from '@/constants/fonts';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';

// Helper to get page number from paragraph ID
function getPageNumber(paragraphId: string): number | null {
  const chapterId = paragraphId.substring(0, paragraphId.lastIndexOf('-p'));
  const chapter = bigBookContent[chapterId];
  if (!chapter) return null;
  const paragraph = chapter.paragraphs.find(p => p.id === paragraphId);
  return paragraph?.pageNumber ?? null;
}

// Helper to get chapter title without the number prefix (e.g., "1. Bill's Story" -> "Bill's Story")
function getChapterTitleWithoutNumber(chapterId: string): string {
  const meta = getChapterMeta(chapterId);
  if (!meta) return chapterId;
  // Remove leading number and period (e.g., "1. ", "10. ")
  return meta.title.replace(/^\d+\.\s*/, '');
}

interface BigBookHighlightsListProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToHighlight: (chapterId: string, paragraphId: string) => void;
}

// A merged highlight group for display purposes
interface MergedHighlight {
  ids: string[];              // All highlight IDs in this group
  groupId?: string;           // Shared ID for cross-paragraph range highlights
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
  const { readingSize: fontSize, readingLineHeight: lineHeight } = useReadingSize();
  const styles = useThemedStyles(makeStyles);
  const { c } = useTokens();

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
        const aIndex = a.sentenceIndex ?? a.startOffset ?? 0;
        const bIndex = b.sentenceIndex ?? b.startOffset ?? 0;
        return aIndex - bIndex;
      });
      
      const merged: MergedHighlight[] = [];
      let currentGroup: BigBookHighlight[] = [];
      
      sorted.forEach((highlight, index) => {
        if (currentGroup.length === 0) {
          // Start new group
          currentGroup.push(highlight);
        } else {
          const lastInGroup = currentGroup[currentGroup.length - 1];
          const isSameRangeGroup = !!highlight.groupId && highlight.groupId === lastInGroup.groupId;
          // Check if this highlight is consecutive (same paragraph, next sentence index, same color)
          const isConsecutiveSentence = 
            highlight.paragraphId === lastInGroup.paragraphId &&
            highlight.sentenceIndex !== undefined &&
            lastInGroup.sentenceIndex !== undefined &&
            highlight.sentenceIndex === lastInGroup.sentenceIndex + 1 &&
            highlight.color === lastInGroup.color;
          
          if (isSameRangeGroup || isConsecutiveSentence) {
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
    const combinedText = group[0].groupId ? group[0].textSnapshot : group.map(h => h.textSnapshot).join(' ');
    // Find the first note
    const note = group.find(h => h.note)?.note;
    // Use earliest createdAt
    const createdAt = Math.min(...group.map(h => h.createdAt));
    
    return {
      ids: group.map(h => h.id),
      groupId: group[0].groupId,
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
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Highlights</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={18} color={c.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {totalMergedCount === 0 ? (
          <View style={styles.empty}>
            <Highlighter size={30} color={c.textMuted} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>No highlights yet</Text>
            <Text style={styles.emptyBody}>
              Long-press and select text in the Big Book to create your first highlight.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
            {sortedChapterIds.map(chapterId =>
              groupedHighlights[chapterId].map(merged => {
                const key = merged.ids.join('-');
                return (
                  <View key={key} style={styles.hlRow}>
                    <View style={[styles.colorBar, { backgroundColor: merged.color }]} />
                    <Pressable
                      style={styles.hlMain}
                      onPress={() => handleNavigate(merged.chapterId, merged.paragraphId)}
                    >
                      <Text style={styles.hlChapter} numberOfLines={1}>
                        {getChapterTitleWithoutNumber(merged.chapterId)} · p. {getPageNumber(merged.paragraphId) ?? '?'}
                      </Text>
                      <Text style={[styles.hlText, { fontSize, lineHeight }]} numberOfLines={3}>
                        {parseMarkdownItalics(merged.combinedText, merged.ids[0])}
                      </Text>
                      {merged.note && (
                        <View style={styles.noteContainer}>
                          <Text style={styles.noteLabel}>NOTE</Text>
                          <Text style={styles.noteText}>{merged.note}</Text>
                        </View>
                      )}
                      <Text style={styles.hlDate}>
                        {new Date(merged.createdAt).toLocaleDateString()}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.hlDelete}
                      onPress={() => handleDeleteMerged(merged.ids)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={17} color={c.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  const ACCENT = colors.steelDark;
  const darkCard = isDark ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' } : null;
  return StyleSheet.create({
    sheet: { flex: 1, backgroundColor: c.background },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
    sheetTitle: { fontFamily: fontFamily.displayBold, fontSize: 22, letterSpacing: -0.4, color: c.text },
    closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    sheetList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },

    // empty state
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36, gap: 10 },
    emptyTitle: { fontFamily: fontFamily.display, fontSize: 18, color: c.text, marginTop: 4 },
    emptyBody: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textMuted, textAlign: 'center' },

    // highlight row
    hlRow: { flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8, overflow: 'hidden', ...darkCard },
    colorBar: { width: 4, alignSelf: 'stretch' },
    hlMain: { flex: 1, paddingVertical: 13, paddingLeft: 14, paddingRight: 8 },
    hlChapter: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: ACCENT, marginBottom: 5 },
    hlText: { fontFamily: readerSerif, color: c.text, marginBottom: 8 },
    noteContainer: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : c.background, padding: 9, borderRadius: 8, marginBottom: 8 },
    noteLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.6, color: c.textMuted, marginBottom: 3 },
    noteText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },
    hlDate: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted },
    hlDelete: { width: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  });
};
