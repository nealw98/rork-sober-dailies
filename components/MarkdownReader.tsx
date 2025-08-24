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
  targetPageNumber?: number;
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

  const [targetPage, setTargetPage] = useState('');

  // Clean content by removing any HTML that might have been added
  const cleanContent = React.useMemo(() => {
    return content
      .replace(/<div[^>]*data-page[^>]*>.*?<\/div>/g, '')
      .replace(/<div[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      .trim();
  }, [content]);

  // Extract page numbers for ref tracking
  const pageNumbers = React.useMemo(() => {
    const matches = cleanContent.match(/(--- \*Page (\d+)\* ---|— Page (\d+) —)/g) || [];
    return matches.map(match => {
      const pageMatch = match.match(/(--- \*Page (\d+)\* ---|— Page (\d+) —)/);
      return pageMatch ? parseInt(pageMatch[2] || pageMatch[3], 10) : null;
    }).filter((num): num is number => num !== null);
  }, [cleanContent]);

  // Extract page numbers and their positions for anchoring
  const pageAnchors = React.useMemo(() => {
    const regex = /(--- \*Page (\d+)\* ---|— Page (\d+) —)/g;
    const anchors: { pageNumber: number; position: number }[] = [];
    let match;
    
    while ((match = regex.exec(cleanContent)) !== null) {
      anchors.push({
        pageNumber: parseInt(match[2] || match[3], 10),
        position: match.index
      });
    }
    
    return anchors;
  }, [cleanContent]);

  const scrollToPage = (pageNumber: number) => {
    const pageRef = pageRefs.current[`page-${pageNumber}`];
    if (pageRef && scrollViewRef.current) {
      pageRef.measureLayout(
        scrollViewRef.current.getInnerViewNode(),
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 50), // Small offset to show the page marker
            animated: true
          });
        },
        () => console.log('Failed to measure page position')
      );
    } else {
      console.log(`Page ref not found for page ${pageNumber}`);
    }
  };

  const findPagePosition = (pageNumber: number): number | null => {
    const pageMarker1 = `--- *Page ${pageNumber}* ---`;
    const pageMarker2 = `— Page ${pageNumber} —`;
    let position = cleanContent.indexOf(pageMarker1);
    if (position < 0) {
      position = cleanContent.indexOf(pageMarker2);
    }
    return position >= 0 ? position : null;
  };

  const handleGoToPage = () => {
    Alert.prompt(
      "Go to Page",
      `Enter page number (1-${pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1})`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Go", 
          onPress: (pageInput) => {
            const pageNum = parseInt(pageInput || '', 10);
            const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPage) {
              scrollToPage(pageNum);
            } else {
              Alert.alert("Invalid Page", "Please enter a valid page number.");
            }
          }
        }
      ],
      "plain-text",
      "",
      "number-pad"
    );
  };

  useEffect(() => {
    if (targetPageNumber) {
      // Use page-based scrolling
      setTimeout(() => {
        scrollToPage(targetPageNumber);
      }, 300); // Give more time for refs to be set
    } else if (initialScrollPosition && scrollViewRef.current) {
      // Fallback to position-based scrolling  
      const scrollY = initialScrollPosition * 0.8;
      console.log(`DEBUG MarkdownReader: Scrolling to position ${initialScrollPosition} -> ${scrollY}`);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollY,
          animated: false
        });
      }, 100);
    }
  }, [initialScrollPosition, targetPageNumber]);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.light.tint} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        
        <View style={styles.headerControls}>
          {/* Only show page navigation for multi-page content */}
          {pageNumbers.length > 1 && (
            <TouchableOpacity 
              style={styles.goToPageButton}
              onPress={handleGoToPage}
            >
              <Text style={styles.goToPageButtonText}>Go to Page</Text>
            </TouchableOpacity>
          )}
        </View>
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
        />
        
        {/* Hidden anchor components for each page */}
        {pageNumbers.map(pageNumber => (
          <View
            key={`manual-anchor-${pageNumber}`}
            ref={(ref) => {
              if (ref) {
                pageRefs.current[`page-${pageNumber}`] = ref;
              }
            }}
            style={{ 
              position: 'absolute', 
              top: -1000, // Hide it way off screen
              height: 1, 
              width: 1, 
              opacity: 0 
            }}
          />
        ))}
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