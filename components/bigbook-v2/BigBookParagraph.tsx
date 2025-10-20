/**
 * Big Book Paragraph Component - Phase 5
 * 
 * Renders a paragraph broken into tappable sentences with:
 * - Sentence-level highlighting (tap to highlight)
 * - Multiple sentence selection in highlight mode
 * - Bookmark indicator
 * - Page number marker
 * - Highlight edit menu
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BigBookParagraph as ParagraphType, HighlightColor } from '@/types/bigbook-v2';
import { useParagraphHighlights } from '@/hooks/use-bigbook-highlights';
import { isPageMarker } from '@/lib/bigbook-page-utils';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface BigBookParagraphProps {
  paragraph: ParagraphType;
  showPageNumber?: boolean;
  highlightMode?: boolean;
  onSentenceTap?: (sentenceIndex: number, sentenceText: string) => void;
  onHighlightTap?: (sentenceIndex: number) => void;
}

// Map highlight colors to actual color values
const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  [HighlightColor.YELLOW]: '#FEF08A',
  [HighlightColor.GREEN]: '#BBF7D0',
  [HighlightColor.BLUE]: '#BFDBFE',
  [HighlightColor.PINK]: '#FBCFE8',
};

/**
 * Parse paragraph text into sentences
 * Splits on . ! ? followed by space or end of string
 */
function parseSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ? followed by space or end
  const sentences = text.split(/([.!?]+(?:\s+|$))/g);
  
  // Combine sentence text with its punctuation
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    if (sentences[i] && sentences[i].trim()) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      result.push(sentence);
    }
  }
  
  return result.filter(s => s.trim().length > 0);
}

/**
 * Check if paragraph contains a markdown table
 */
function isMarkdownTable(text: string): boolean {
  return text.includes('|') && text.includes('\n') && text.split('\n').length >= 3;
}

/**
 * Parse markdown table into structured data
 */
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 3) return null;

  // Parse headers
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
  
  // Skip separator line (line 1)
  
  // Parse rows
  const rows = lines.slice(2).map(line =>
    line.split('|').map(cell => cell.trim()).filter(cell => cell)
  );

  return { headers, rows };
}

export function BigBookParagraph({ 
  paragraph, 
  showPageNumber = true,
  highlightMode = false,
  onSentenceTap,
  onHighlightTap,
}: BigBookParagraphProps) {
  const { highlights, isLoading: highlightsLoading } = useParagraphHighlights(paragraph.id);

  // Skip rendering if this is just a page marker
  if (isPageMarker(paragraph.content)) {
    return null;
  }

  console.log('[BigBookParagraph] RENDER - paragraph:', paragraph.id, 'highlights:', highlights.length);

  // Parse paragraph into sentences
  const sentences = useMemo(() => parseSentences(paragraph.content), [paragraph.content]);

  // Check if this is a verse/poem (contains newlines but not a table)
  const isVerse = paragraph.content.includes('\n') && !isMarkdownTable(paragraph.content);

  // Check if this is a table
  const isTable = isMarkdownTable(paragraph.content);
  const tableData = useMemo(() => {
    if (isTable) {
      return parseMarkdownTable(paragraph.content);
    }
    return null;
  }, [isTable, paragraph.content]);

  // Create a map of sentence index to highlight
  const highlightMap = useMemo(() => {
    const map = new Map<number, { color: string; highlightId: string; note?: string }>();
    highlights.forEach(highlight => {
      console.log('[BigBookParagraph] Processing highlight:', highlight.sentenceIndex, 'color:', highlight.color);
      map.set(highlight.sentenceIndex, {
        color: HIGHLIGHT_COLORS[highlight.color],
        highlightId: highlight.id,
        note: highlight.note,
      });
    });
    console.log('[BigBookParagraph] Highlight map for', paragraph.id, ':', {
      highlightsCount: highlights.length,
      mapSize: map.size,
      sentencesWithHighlights: Array.from(map.keys())
    });
    return map;
  }, [highlights, paragraph.id]);

  // Determine if we should show page number
  const shouldShowPageNumber = useMemo(() => {
    return showPageNumber && paragraph.order === 1;
  }, [showPageNumber, paragraph.order]);

  const handleSentenceTap = (index: number, sentenceText: string) => {
    console.log('[BigBookParagraph] Sentence tapped:', { 
      index, 
      sentenceText: sentenceText.substring(0, 50) + '...', 
      highlightMode,
      hasOnSentenceTap: !!onSentenceTap 
    });
    
    const existingHighlight = highlightMap.get(index);
    
    if (existingHighlight && onHighlightTap) {
      // Tapped an existing highlight - show edit menu
      console.log('[BigBookParagraph] Existing highlight tapped, calling onHighlightTap');
      onHighlightTap(index);
    } else if (highlightMode && onSentenceTap) {
      // In highlight mode, tapping unhighlighted sentence - add highlight
      console.log('[BigBookParagraph] New highlight, calling onSentenceTap');
      onSentenceTap(index, sentenceText);
    } else {
      console.log('[BigBookParagraph] No action taken - highlightMode:', highlightMode, 'onSentenceTap:', !!onSentenceTap);
    }
  };

  return (
    <View style={styles.container}>
      {/* Page Number */}
      {shouldShowPageNumber && (
        <View style={styles.pageNumberContainer}>
          <Text style={styles.pageNumber}>Page {paragraph.pageNumber}</Text>
          <View style={styles.pageNumberLine} />
        </View>
      )}

      {/* Paragraph Content */}
      <View style={styles.paragraphContainer}>
        {isTable && tableData ? (
          /* Render Table */
          <View style={styles.tableContainer}>
            {/* Table Headers */}
            <View style={styles.tableRow}>
              {tableData.headers.map((header, index) => (
                <View key={index} style={[styles.tableCell, styles.tableHeaderCell]}>
                  <Text style={styles.tableHeaderText}>{header}</Text>
                </View>
              ))}
            </View>
            {/* Table Rows */}
            {tableData.rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {row.map((cell, cellIndex) => (
                  <View key={cellIndex} style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{cell}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          /* Render Normal Text */
          <Text style={[styles.paragraphText, isVerse && styles.verseText]}>
            {sentences.map((sentence, index) => {
            const highlight = highlightMap.get(index);
            const isHighlighted = !!highlight;
            const highlightColor = highlight?.color;
            const isInteractive = highlightMode || isHighlighted;

            if (index === 0 || isHighlighted) {
              console.log('[BigBookParagraph] Rendering sentence', index, ':', {
                isHighlighted,
                highlightColor: highlight?.color,
                sentencePreview: sentence.substring(0, 30)
              });
            }

            if (isInteractive) {
              return (
                <Text
                  key={index}
                  onPress={() => handleSentenceTap(index, sentence)}
                  style={[
                    styles.sentence,
                    isHighlighted && { backgroundColor: highlightColor },
                    highlightMode && !isHighlighted && styles.sentenceHoverable,
                  ]}
                >
                  {sentence}
                </Text>
              );
            } else {
              return (
                <Text
                  key={index}
                  style={[
                    styles.sentence,
                    isHighlighted && { backgroundColor: highlightColor },
                  ]}
                >
                  {sentence}
                </Text>
              );
            }
          })}
        </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  pageNumberContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    marginBottom: 8,
  },
  pageNumberLine: {
    height: 1,
    backgroundColor: Colors.light.border || '#E5E7EB',
  },
  paragraphContainer: {
    flex: 1,
  },
  paragraphText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('400'),
  },
  verseText: {
    marginLeft: 24,
    fontStyle: 'italic',
  },
  sentence: {
    // Inherit from parent paragraphText
  },
  sentenceHoverable: {
    // Visual feedback when in highlight mode
    // Could add subtle underline or other indicator
  },
  tableContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.light.border || '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border || '#E5E7EB',
  },
  tableHeaderCell: {
    backgroundColor: '#F3F4F6',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: adjustFontWeight('700'),
    color: Colors.light.text,
  },
  tableCellText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
});
