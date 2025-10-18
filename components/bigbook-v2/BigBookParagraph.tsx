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
        {/* Sentences */}
        <View style={styles.textContainer}>
          {sentences.map((sentence, index) => {
            const highlight = highlightMap.get(index);
            const isHighlighted = !!highlight;
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
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSentenceTap(index, sentence)}
                  activeOpacity={0.7}
                  style={styles.sentenceWrapper}
                >
                  <Text
                    style={[
                      styles.sentence,
                      isHighlighted && { backgroundColor: highlight.color },
                      highlightMode && !isHighlighted && styles.sentenceHoverable,
                    ]}
                  >
                    {sentence}
                  </Text>
                </TouchableOpacity>
              );
            } else {
              return (
                <Text
                  key={index}
                  style={[
                    styles.sentence,
                    isHighlighted && { backgroundColor: highlight.color },
                  ]}
                >
                  {sentence}
                </Text>
              );
            }
          })}
        </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sentenceWrapper: {
    // Wrapper for touchable sentences
  },
  sentence: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('400'),
  },
  sentenceHoverable: {
    // Visual feedback when in highlight mode
    // Could add subtle underline or other indicator
  },
});
