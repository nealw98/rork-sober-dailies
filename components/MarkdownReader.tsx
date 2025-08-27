import React, { useRef, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ViewStyle, 
  TextStyle,
  TextInput,
  Keyboard,
  Platform,
  Alert
} from 'react-native';
import { ChevronLeft, Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { CustomTextRenderer } from './CustomTextRenderer';

interface MarkdownReaderProps {
  content: string;
  title: string;
  sectionId: string;
  onClose: () => void;
  searchQuery?: string;
  searchHighlight?: {
    query: string;
    position: number;
    length: number;
  };
  initialScrollPosition?: number;
  targetPageNumber?: string;
}

const MarkdownReader = ({ 
  content, 
  title, 
  sectionId, 
  onClose,
  searchQuery,
  searchHighlight,
  initialScrollPosition,
  targetPageNumber
}: MarkdownReaderProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const pageRefs = useRef<{ [pageNumber: string]: View | null }>({});
  const pageYPositions = useRef<{ [pageNumber: string]: number }>({});

  const [targetPage, setTargetPage] = useState('');

  // Clean content by removing any HTML that might have been added
  const cleanContent = React.useMemo(() => {
    return content
      .replace(/<div[^>]*data-page[^>]*>.*?<\/div>/g, '')
      .replace(/<div[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      .trim();
  }, [content]);

  // Extract page numbers for ref tracking - Updated for new format
  const pageNumbers = React.useMemo(() => {
    const matches = cleanContent.match(/\*— Page (\d+|\w+) —\*/g) || [];
    return matches.map(match => {
      const pageMatch = match.match(/\*— Page (\d+|\w+) —\*/);
      if (pageMatch) {
        const pageStr = pageMatch[1];
        return isNaN(parseInt(pageStr, 10)) ? -1 : parseInt(pageStr, 10); // Handle Roman numerals
      }
      return null;
    }).filter((num): num is number => num !== null && num > 0);
  }, [cleanContent]);

  // Extract page numbers - now only used for the "Go to Page" button validation
  const pageAnchors = React.useMemo(() => {
    const regex = /\*— Page (\d+|\w+) —\*/g;
    const anchors: { pageNumber: number; position: number }[] = [];
    let match;
    
    while ((match = regex.exec(cleanContent)) !== null) {
      const pageStr = match[1];
      const pageNum = isNaN(parseInt(pageStr, 10)) ? -1 : parseInt(pageStr, 10);
      if (pageNum > 0) {
        anchors.push({
          pageNumber: pageNum,
          position: match.index
        });
      }
    }
    
    return anchors;
  }, [cleanContent]);

  // Robust scroll to known y position with retries
  const scrollToTargetY = (attempt = 1) => {
    if (targetPageNumber && typeof pageYPositions.current[`page-${targetPageNumber}`] === 'number' && scrollViewRef.current) {
      const y = pageYPositions.current[`page-${targetPageNumber}`];
      console.log(`📍 Scrolling to cached Y for page ${targetPageNumber}: y=${y} (attempt ${attempt})`);
      if (y >= 0) {
        const PAGE_START_OFFSET = -5; // minimal offset from prior line
        scrollViewRef.current.scrollTo({ y: Math.max(0, y + PAGE_START_OFFSET), animated: true });
        return;
      }
    }
    if (attempt < 8) {
      setTimeout(() => scrollToTargetY(attempt + 1), 150);
    } else {
      console.warn(`📍 Failed to obtain Y for page ${targetPageNumber} after ${attempt} attempts`);
    }
  };

  useEffect(() => {
    console.log('📍 MarkdownReader useEffect:', { targetPageNumber, initialScrollPosition });
    if (targetPageNumber) {
      setTimeout(() => scrollToTargetY(), 100);
    } else if (initialScrollPosition && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, initialScrollPosition - 100), animated: true });
      }, 100);
    }
  }, [targetPageNumber, initialScrollPosition]);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.light.tint} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        {/* Removed headerControls with Go to Page button */}
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <CustomTextRenderer 
          content={cleanContent}
          searchTerm={searchHighlight?.query}
          style={styles.textContent}
          onPageRef={(pageNumber, ref) => {
            if (ref) {
              pageRefs.current[`page-${pageNumber}`] = ref;
            }
          }}
          getScrollViewNode={() => scrollViewRef.current?.getInnerViewNode?.()}
          onPageLayout={(pageNumber, y) => {
            pageYPositions.current[`page-${pageNumber}`] = y;
          }}
        />
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
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  goToPageButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  goToPageButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
  },
  highlight: {
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
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