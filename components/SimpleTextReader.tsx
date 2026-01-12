import React, { useMemo } from 'react';
import { 
  StyleSheet, 
  ScrollView,
  View, 
  Text, 
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
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
  const { fontSize, lineHeight, resetDefaults } = useTextSettings();

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
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
      
      <View style={styles.contentWrapper}>
        <ScrollView 
          key={`reader-scroll-${title}-${fontSize}-${lineHeight}`}
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
    backgroundColor: '#f5f6f8',
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
  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
