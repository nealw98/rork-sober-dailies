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
  isPageBreak?: boolean;
  fontSize?: number;
  lineHeight?: number;
  highlightMode?: boolean;
  searchTerm?: string;
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

/**
 * Parse text with markdown italics (*text*) and return React Native Text components
 * Based on ChatMarkdownRenderer implementation
 */
function parseMarkdownItalics(text: string, key: string | number): React.ReactNode {
  if (!text) return text;

  const parts: Array<{ text: string; italic: boolean }> = [];
  // Support both asterisks and underscores for italics
  const italicRegex = /(\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), italic: false });
    }
    // match[2] is the content from asterisks, match[3] is from underscores
    parts.push({ text: match[2] || match[3], italic: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), italic: false });
  }

  // If no parts were found (no valid markdown), return the original text
  if (parts.length === 0) {
    return text;
  }

  // Return array of Text components for italic parts, strings for regular parts
  return parts.map((part, idx) => 
    part.italic ? (
      <Text key={`${key}-${idx}`} style={{ fontStyle: 'italic' }}>
        {part.text}
      </Text>
    ) : (
      part.text
    )
  );
}

/**
 * Check if text matches search term (word-prefix matching)
 */
function matchesSearchTerm(text: string, searchTerm: string): boolean {
  if (!searchTerm) return false;
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedTerm}`, 'i');
  return regex.test(text);
}

/**
 * Highlight search term in text (word-prefix matching with full word highlighting)
 */
function highlightSearchTerm(text: string, searchTerm: string, key: string | number): React.ReactNode {
  if (!searchTerm) return parseMarkdownItalics(text, key);
  
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedTerm}`, 'gi');
  let match: RegExpExecArray | null;
  const parts: Array<{ text: string; isMatch: boolean; startIndex: number; endIndex: number }> = [];
  let lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    
    // Find the end of the word
    let matchEnd = matchStart + match[0].length;
    while (matchEnd < text.length && /[a-zA-Z]/.test(text[matchEnd])) {
      matchEnd++;
    }
    
    // Add text before match
    if (matchStart > lastIndex) {
      parts.push({ 
        text: text.slice(lastIndex, matchStart), 
        isMatch: false,
        startIndex: lastIndex,
        endIndex: matchStart
      });
    }
    
    // Add matched word
    parts.push({ 
      text: text.slice(matchStart, matchEnd), 
      isMatch: true,
      startIndex: matchStart,
      endIndex: matchEnd
    });
    
    lastIndex = matchEnd;
    regex.lastIndex = matchEnd;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ 
      text: text.slice(lastIndex), 
      isMatch: false,
      startIndex: lastIndex,
      endIndex: text.length
    });
  }
  
  // If no matches, just parse markdown
  if (parts.length === 0 || !parts.some(p => p.isMatch)) {
    return parseMarkdownItalics(text, key);
  }
  
  // Render with search highlights
  return parts.map((part, idx) => {
    if (part.isMatch) {
      return (
        <Text key={`${key}-search-${idx}`} style={{ backgroundColor: '#5EEAD4' }}>
          {parseMarkdownItalics(part.text, `${key}-search-${idx}`)}
        </Text>
      );
    } else {
      return parseMarkdownItalics(part.text, `${key}-nosearch-${idx}`);
    }
  });
}

export function BigBookParagraph({ 
  paragraph, 
  showPageNumber = true,
  isPageBreak = false,
  fontSize = 18,
  lineHeight = 27, // fontSize * 1.5 (industry standard)
  highlightMode = false,
  searchTerm,
  onSentenceTap,
  onHighlightTap,
}: BigBookParagraphProps) {
  const { highlights, isLoading: highlightsLoading } = useParagraphHighlights(paragraph.id);

  // Skip rendering if this is just a page marker
  if (isPageMarker(paragraph.content)) {
    return null;
  }

  // Parse paragraph into sentences (preserves markdown for later parsing)
  const sentences = useMemo(() => parseSentences(paragraph.content), [paragraph.content]);

  // Check if this is a numbered list item (starts with number followed by period)
  const numberedListMatch = useMemo(() => {
    const match = paragraph.content.match(/^(\d{1,2}\.\s)(.+)$/s);
    if (match) {
      return {
        number: match[1],
        text: match[2],
      };
    }
    return null;
  }, [paragraph.content]);

  // Check if this is a lettered list item (starts with (a), (b), (c), etc.)
  const letteredListMatch = useMemo(() => {
    const match = paragraph.content.match(/^(\([a-z]\)\s)(.+)$/s);
    if (match) {
      return {
        letter: match[1],
        text: match[2],
      };
    }
    return null;
  }, [paragraph.content]);

  const isNumberedListItem = !!numberedListMatch;
  const isLetteredListItem = !!letteredListMatch;

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
      map.set(highlight.sentenceIndex, {
        color: HIGHLIGHT_COLORS[highlight.color],
        highlightId: highlight.id,
        note: highlight.note,
      });
    });
    return map;
  }, [highlights]);

  // Determine if we should show page number
  const shouldShowPageNumber = useMemo(() => {
    return showPageNumber && paragraph.order === 1;
  }, [showPageNumber, paragraph.order]);

  const handleSentenceTap = (index: number, sentenceText: string) => {
    const existingHighlight = highlightMap.get(index);
    
    if (existingHighlight && onHighlightTap) {
      // Tapped an existing highlight - show edit menu
      onHighlightTap(index);
    } else if (highlightMode && onSentenceTap) {
      // In highlight mode, tapping unhighlighted sentence - add highlight
      onSentenceTap(index, sentenceText);
    }
  };

  return (
    <View style={styles.container}>
      {/* Page Break Divider */}
      {isPageBreak && (
        <View style={{ alignItems: 'center', marginTop: -5, marginBottom: 20 }}>
          <View style={styles.pageBreakDivider} />
        </View>
      )}

      {/* Page Number */}
      {shouldShowPageNumber && (
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <View style={styles.pageBreakDivider} />
          <Text style={styles.pageNumber}>Page {paragraph.pageNumber}</Text>
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
                  <Text style={[styles.tableHeaderText, { fontSize: fontSize * 0.875 }]}>{header}</Text>
                </View>
              ))}
            </View>
            {/* Table Rows */}
            {tableData.rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {row.map((cell, cellIndex) => (
                  <View key={cellIndex} style={styles.tableCell}>
                    <Text style={[styles.tableCellText, { fontSize: fontSize * 0.875, lineHeight: fontSize * 0.875 * 1.43 }]}>{cell}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : isNumberedListItem && numberedListMatch ? (
          /* Render Numbered List with Hanging Indent */
          <View style={styles.numberedListContainer}>
            <Text style={[
              styles.numberedListNumber,
              paragraph.isItalic && { fontStyle: 'italic' },
              { fontSize: fontSize, lineHeight }
            ]}>
              {numberedListMatch.number}
            </Text>
            <Text style={[
              styles.numberedListText,
              paragraph.isItalic && { fontStyle: 'italic' },
              { fontSize: fontSize, lineHeight }
            ]}>
              {numberedListMatch.text}
            </Text>
          </View>
        ) : isLetteredListItem && letteredListMatch ? (
          /* Render Lettered List with Hanging Indent */
          <View style={styles.letteredListContainer}>
            <Text style={[
              styles.letteredListLetter,
              paragraph.isItalic && { fontStyle: 'italic' },
              { fontSize: fontSize, lineHeight }
            ]}>
              {letteredListMatch.letter}
            </Text>
            <Text style={[
              styles.letteredListText,
              paragraph.isItalic && { fontStyle: 'italic' },
              { fontSize: fontSize, lineHeight }
            ]}>
              {letteredListMatch.text}
            </Text>
          </View>
        ) : (
          /* Render Normal Text */
          <View style={isNumberedListItem && styles.numberedListContainer}>
            <Text style={[
              styles.paragraphText, 
              isVerse && styles.verseText, 
              paragraph.isItalic && { fontStyle: 'italic' },
              { fontSize: fontSize, lineHeight }
            ]}>
            {sentences.map((sentence, index) => {
            const highlight = highlightMap.get(index);
            const isHighlighted = !!highlight;
            const highlightColor = highlight?.color;
            const isInteractive = highlightMode || isHighlighted;

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
                  {highlightSearchTerm(sentence, searchTerm || '', index)}
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
                  {highlightSearchTerm(sentence, searchTerm || '', index)}
                </Text>
              );
            }
          })}
        </Text>
          </View>
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
  pageBreakDivider: {
    width: 120,
    height: 1,
    backgroundColor: '#666666', // Darker gray line for visibility
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
    color: '#000',
    fontWeight: adjustFontWeight('400'),
  },
  verseText: {
    marginLeft: 24,
    fontStyle: 'italic',
  },
  numberedListContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  numberedListNumber: {
    width: 32,
    flexShrink: 0,
    color: '#000',
    fontWeight: adjustFontWeight('400'),
  },
  numberedListText: {
    flex: 1,
    color: '#000',
    fontWeight: adjustFontWeight('400'),
  },
  letteredListContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  letteredListLetter: {
    width: 32,
    flexShrink: 0,
    color: '#000',
    fontWeight: adjustFontWeight('400'),
  },
  letteredListText: {
    flex: 1,
    color: '#000',
    fontWeight: adjustFontWeight('400'),
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
    color: '#000',
  },
  tableCellText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
});
