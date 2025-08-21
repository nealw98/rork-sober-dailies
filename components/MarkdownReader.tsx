import React from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, SafeAreaView, ViewStyle, TextStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';

interface MarkdownReaderProps {
  content: string;
  title: string;
  sectionId: string;
  onClose: () => void;
}

const MarkdownReader = ({ content, title, sectionId, onClose }: MarkdownReaderProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.light.tint} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Markdown
          style={markdownStyles as any}
          rules={{
            hr: (node, children, parent, styles) => (
              <View key={node.key} style={styles.hr}>
                <Text style={styles.pageNumber}>{children}</Text>
              </View>
            )
          }}
        >
          {content}
        </Markdown>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    backgroundColor: Colors.light.cardBackground
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    zIndex: 1
  },
  backText: {
    color: Colors.light.tint,
    fontSize: 16,
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
  }
});

const markdownStyles = {
  body: {
    color: Colors.light.text,
    fontSize: 16,
    lineHeight: 24
  } as TextStyle,
  heading1: {
    fontSize: 16,
    fontWeight: adjustFontWeight('bold'),
    color: Colors.light.text,
    marginBottom: 24,
    marginTop: 8,
    textAlign: 'center'
  } as TextStyle,
  heading2: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginVertical: 16
  } as TextStyle,
  paragraph: {
    marginVertical: 12,
    fontSize: 16,
    lineHeight: 24
  } as TextStyle,
  hr: {
    marginVertical: 24,
    alignItems: 'center' as const
  } as ViewStyle,
  pageNumber: {
    fontStyle: 'italic',
    color: Colors.light.muted,
    fontSize: 16,
    textAlign: 'center'
  } as TextStyle,
  em: {
    fontStyle: 'italic',
    color: Colors.light.muted
  } as TextStyle,
  strong: {
    fontWeight: adjustFontWeight('600')
  } as TextStyle,
  link: {
    color: Colors.light.tint
  } as TextStyle,
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
    paddingLeft: 16,
    marginLeft: 0,
    marginVertical: 12
  } as ViewStyle,
  code_inline: {
    fontFamily: 'Courier',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 4,
    borderRadius: 4
  } as TextStyle,
  list_item: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-start'
  } as ViewStyle
};

export default MarkdownReader;