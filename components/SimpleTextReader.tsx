import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Platform
} from 'react-native';
import { ChevronLeft, Type } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface SimpleTextReaderProps {
  content: string;
  title: string;
  onClose: () => void;
  indentParagraphs?: boolean;
  source?: string;
}

const SimpleTextReader = ({ content, title, onClose, indentParagraphs = false, source }: SimpleTextReaderProps) => {
  // Font size state (replacing pinch-to-zoom)
  const [fontSize, setFontSize] = useState(16);
  const baseFontSize = 16;
  
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 28));
  };
  
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      setFontSize(baseFontSize);
    })
    .runOnJS(true), [baseFontSize]);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onClose}
          activeOpacity={0.7}
        >
          <ChevronLeft color={Colors.light.tint} size={24} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        
        {/* Font Size Controls */}
        <View style={styles.fontSizeControls}>
          <TouchableOpacity 
            onPress={decreaseFontSize}
            style={styles.fontSizeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Type size={16} color={Colors.light.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={increaseFontSize}
            style={styles.fontSizeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Type size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <GestureDetector gesture={doubleTapGesture}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
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
              const labelWidth = Math.max(22, 16 + numbered[1].length * 8); // widen slightly for 2+ digits
              lastWasBlank = false;
              return (
                <View key={idx} style={styles.numberRow}>
                  <Text style={[styles.numberLabel, { width: labelWidth }]}>{label}</Text>
                  {renderMarkdownText(text, styles.numberText)}
                </View>
              );
            }
            // Render lettered list item with hanging indent (no first-line indent)
            if (lettered && !isKnownHeading) {
              const label = `(${lettered[1].toLowerCase()})`;
              const text = lettered[2];
              const labelWidth = 32; // accommodate "(a)"
              lastWasBlank = false;
              return (
                <View key={idx} style={styles.numberRow}>
                  <Text style={[styles.numberLabel, { width: labelWidth }]}>{label}</Text>
                  {renderMarkdownText(text, styles.numberText)}
                </View>
              );
            }
            // Render bulleted list item with hanging indent (no first-line indent)
            if (bulleted && !isKnownHeading) {
              const label = '\u2022'; // bullet •
              const text = bulleted[1];
              const labelWidth = 22;
              lastWasBlank = false;
              return (
                <View key={idx} style={styles.numberRow}>
                  <Text style={[styles.numberLabel, { width: labelWidth }]}>{label}</Text>
                  {renderMarkdownText(text, styles.numberText)}
                </View>
              );
            }
            const prefix = indentParagraphs && lastWasBlank && !isKnownHeading ? '\u2003' : '';
            lastWasBlank = false;
            const textToRender = prefix + trimmed;
            return (
              <View key={idx}>
                {renderMarkdownText(textToRender, isKnownHeading ? [styles.headingText, { fontSize }] : [styles.textContent, { fontSize, lineHeight: fontSize * 1.375 }])}
              </View>
            );
          });
        })()}
        {source ? (
          <Text style={[styles.sourceText, { fontSize: fontSize * 0.875 }]}>{source}</Text>
        ) : null}
        </ScrollView>
        </GestureDetector>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 6 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    backgroundColor: Colors.light.cardBackground
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: Platform.OS === 'android' ? 8 : 16,
    zIndex: 1
  },
  backText: {
    color: Colors.light.tint,
    fontSize: 14,
    marginLeft: 4,
    fontWeight: adjustFontWeight('500')
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'absolute',
    right: Platform.OS === 'android' ? 8 : 16,
    paddingRight: 4,
    zIndex: 1,
  },
  fontSizeButton: {
    padding: 4,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20
  },
  textContent: {
    fontSize: 16,
    lineHeight: 22,
    color: Colors.light.text,
  },
  italicText: {
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: adjustFontWeight('700'),
  },
  headingText: {
    fontSize: 16,
    lineHeight: 22,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('700')
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  numberLabel: {
    textAlign: 'right',
    marginRight: 8,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('600')
  },
  numberText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.light.text,
  },
  sourceText: {
    marginTop: 16,
    fontSize: 12,
    color: Colors.light.muted,
    fontStyle: 'italic'
  }
});

export default SimpleTextReader;
