/**
 * Simple Text Reader Component
 * 
 * Full-screen reader for plain text content with:
 * - Gradient header with title
 * - Scrollable text with markdown formatting
 * - Source attribution
 * 
 * Rebuilt to match BigBookReader architecture for reliable cross-platform scrolling.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView,
  View, 
  Text, 
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { ChevronLeft, Type } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';

interface SimpleTextReaderProps {
  content: string;
  title: string;
  onClose: () => void;
  indentParagraphs?: boolean;
  source?: string;
}

const SimpleTextReader = ({ content, title, onClose, indentParagraphs = false, source }: SimpleTextReaderProps) => {
  const insets = useSafeAreaInsets();
  const { fontSize, lineHeight, setFontSize, minFontSize, maxFontSize } = useTextSettings();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Force layout recalculation on Android when component mounts
  // This fixes an issue where initial layout is calculated incorrectly at large font sizes
  const [layoutKey, setLayoutKey] = useState(0);
  
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Trigger LayoutAnimation to force Android to recalculate layout
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // Use setTimeout with small delay to ensure layout is complete before forcing re-render
      const timer = setTimeout(() => {
        setLayoutKey(k => k + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [content]); // Re-run when content changes (new reading selected)
  
  // Font size controls
  const increaseFontSize = useCallback(() => {
    setFontSize(Math.min(fontSize + 2, maxFontSize));
  }, [fontSize, maxFontSize, setFontSize]);
  
  const decreaseFontSize = useCallback(() => {
    setFontSize(Math.max(fontSize - 2, minFontSize));
  }, [fontSize, minFontSize, setFontSize]);

  // Helper function to parse inline markdown (italic, bold)
  const parseMarkdown = (text: string) => {
    const parts: Array<{ text: string; italic?: boolean; bold?: boolean }> = [];
    let current = '';
    let i = 0;
    
    while (i < text.length) {
      // Check for bold (**text**)
      if (text[i] === '*' && text[i + 1] === '*') {
        if (current) {
          parts.push({ text: current });
          current = '';
        }
        i += 2;
        let boldText = '';
        // Look for closing **
        let foundClosing = false;
        let j = i;
        while (j < text.length - 1) {
          if (text[j] === '*' && text[j + 1] === '*') {
            foundClosing = true;
            break;
          }
          j++;
        }
        
        if (foundClosing) {
          while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
            boldText += text[i];
            i++;
          }
          if (boldText) {
            parts.push({ text: boldText, bold: true });
          }
          i += 2; // skip closing **
        } else {
          // No closing **, treat as literal
          current += '**';
        }
      }
      // Check for italic (*text*) - only if there's a matching closing * on the same line
      else if (text[i] === '*') {
        // Look ahead to see if there's a closing * before end of line
        let foundClosing = false;
        let j = i + 1;
        while (j < text.length) {
          if (text[j] === '*') {
            foundClosing = true;
            break;
          }
          j++;
        }
        
        if (foundClosing) {
          // Found a matching pair, treat as italic
          if (current) {
            parts.push({ text: current });
            current = '';
          }
          i++;
          let italicText = '';
          while (i < text.length && text[i] !== '*') {
            italicText += text[i];
            i++;
          }
          if (italicText) {
            parts.push({ text: italicText, italic: true });
          }
          i++; // skip closing *
        } else {
          // No matching closing *, treat as literal asterisk
          current += text[i];
          i++;
        }
      }
      else {
        current += text[i];
        i++;
      }
    }
    
    if (current) {
      parts.push({ text: current });
    }
    
    return parts;
  };

  // Helper function to render parsed markdown
  const renderMarkdownText = (text: string, baseStyle: any) => {
    const parts = parseMarkdown(text);
    return (
      <Text style={baseStyle}>
        {parts.map((part, idx) => (
          <Text
            key={idx}
            style={[
              part.italic && styles.italicText,
              part.bold && styles.boldText,
            ]}
          >
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
      </LinearGradient>
      
      {/* Action Row - matches BigBookReader structure */}
      <View style={styles.actionRow}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={decreaseFontSize}
            activeOpacity={0.8}
            style={styles.actionButton}
          >
            <Text style={styles.fontSizeButtonText}>A-</Text>
          </TouchableOpacity>
          <Type size={18} color="#3D8B8B" />
          <TouchableOpacity 
            onPress={increaseFontSize}
            activeOpacity={0.8}
            style={styles.actionButton}
          >
            <Text style={[styles.fontSizeButtonText, styles.fontSizeButtonTextLarge]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content */}
      <View style={styles.contentWrapper} collapsable={false}>
        <ScrollView 
          key={`text-scroll-${layoutKey}`}
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
            {(() => {
              let lastWasBlank = true;
              const lines = content.split('\n');
              return lines.map((line, idx) => {
              const trimmed = line.trim();
              // Detect numbered list like "1. Text..."
              const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
              // Detect lettered list like "(a) Text..."
              const lettered = trimmed.match(/^\(([a-zA-Z])\)\s+(.*)$/);
              // Detect bullet list like "* Text..." or "- Text..."
              const bulleted = trimmed.match(/^[*-]\s+(.*)$/);
              const isKnownHeading = (
                trimmed === 'Opening' ||
                trimmed === 'Preamble' ||
                trimmed === 'Readings' ||
                trimmed === 'Introductions & Newcomers' ||
                trimmed === 'Announcements' ||
                trimmed === 'Meeting Format' ||
                trimmed === 'Discussion / Speaker' ||
                trimmed === 'Seventh Tradition' ||
                trimmed === 'Closing' ||
                trimmed === 'Anonymity Statement'
              );
              if (trimmed.length === 0) {
                lastWasBlank = true;
                return <Text key={idx} style={styles.textContent}>{'\u00A0'}</Text>;
              }
              // Render numbered list item with hanging indent (no first-line indent)
              if (numbered && !isKnownHeading) {
                const label = `${numbered[1]}.`;
                const text = numbered[2];
                // Scale label width with font size - base width + extra for 2+ digit numbers
                const labelWidth = fontSize * 1.8 + (numbered[1].length > 1 ? fontSize * 0.6 : 0);
                lastWasBlank = false;
                return (
                  <View key={idx} style={styles.numberRow}>
                    <Text style={[styles.numberLabel, { width: labelWidth, fontSize, lineHeight }]} numberOfLines={1}>{label}</Text>
                    {renderMarkdownText(text, [styles.numberText, { fontSize, lineHeight }])}
                  </View>
                );
              }
              // Render lettered list item with hanging indent (no first-line indent)
              if (lettered && !isKnownHeading) {
                const label = `(${lettered[1].toLowerCase()})`;
                const text = lettered[2];
                // Scale label width with font size - "(a)" needs about 2.5x font size
                const labelWidth = fontSize * 2.5;
                lastWasBlank = false;
                return (
                  <View key={idx} style={styles.numberRow}>
                    <Text style={[styles.numberLabel, { width: labelWidth, fontSize, lineHeight }]} numberOfLines={1}>{label}</Text>
                    {renderMarkdownText(text, [styles.numberText, { fontSize, lineHeight }])}
                  </View>
                );
              }
              // Render bulleted list item with hanging indent (no first-line indent)
              if (bulleted && !isKnownHeading) {
                const label = '\u2022'; // bullet •
                const text = bulleted[1];
                // Scale label width with font size
                const labelWidth = fontSize * 1.4;
                lastWasBlank = false;
                return (
                  <View key={idx} style={styles.numberRow}>
                    <Text style={[styles.numberLabel, { width: labelWidth, fontSize, lineHeight }]} numberOfLines={1}>{label}</Text>
                    {renderMarkdownText(text, [styles.numberText, { fontSize, lineHeight }])}
                  </View>
                );
              }
              const prefix = indentParagraphs && lastWasBlank && !isKnownHeading ? '\u2003' : '';
              lastWasBlank = false;
              const textToRender = prefix + trimmed;
              return (
                <View key={idx}>
                  {renderMarkdownText(textToRender, isKnownHeading ? [styles.headingText, { fontSize }] : [styles.textContent, { fontSize, lineHeight }])}
                </View>
              );
            });
            })()}
          {source ? (
            <Text style={[styles.sourceText, { fontSize: fontSize * 0.875 }]}>{source}</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: '#3D8B8B',
    fontWeight: '600',
  },
  fontSizeButtonTextLarge: {
    fontSize: 20,
  },
  contentWrapper: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0, // Start from 0 and grow - helps Android respect constraints
    minHeight: 0, // Critical for Android - allows flex to shrink below content size
    overflow: 'hidden', // Ensures content doesn't push siblings off-screen
    backgroundColor: '#fff',
  },
  content: {
    // Removed flex: 1 - parent contentWrapper handles flex, ScrollView fills naturally
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  textContent: {
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
  },
  italicText: {
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: adjustFontWeight('700'),
  },
  headingText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
    fontWeight: adjustFontWeight('700'),
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  numberLabel: {
    textAlign: 'right',
    marginRight: 8,
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
    fontWeight: adjustFontWeight('600'),
  },
  numberText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: '#000',
  },
  sourceText: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7c8a',
    fontStyle: 'italic',
  },
});

export default SimpleTextReader;
