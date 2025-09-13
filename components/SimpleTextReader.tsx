import React from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Platform
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
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
      </View>
      
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
                  <Text style={styles.numberText}>{text}</Text>
                </View>
              );
            }
            const prefix = indentParagraphs && lastWasBlank && !isKnownHeading ? '\u2003' : '';
            lastWasBlank = false;
            return (
              <Text key={idx} style={isKnownHeading ? styles.headingText : styles.textContent}>
                {prefix}{trimmed.replace(/^\*\*|\*\*$/g, '')}
              </Text>
            );
          });
        })()}
        {source ? (
          <Text style={styles.sourceText}>{source}</Text>
        ) : null}
      </ScrollView>
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
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20
  },
  textContent: {
    fontSize: 20,
    lineHeight: 30,
    color: Colors.light.text,
  }
  ,
  headingText: {
    fontSize: 20,
    lineHeight: 30,
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
    fontSize: 20,
    lineHeight: 30,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('600')
  },
  numberText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 30,
    color: Colors.light.text,
  },
  sourceText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.light.muted,
    fontStyle: 'italic'
  }
});

export default SimpleTextReader;
