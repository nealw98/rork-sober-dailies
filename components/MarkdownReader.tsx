import React, { useRef, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ViewStyle, 
  TextStyle,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  FlatList
} from 'react-native';
import { ScrollView } from 'react-native';
import { ChevronLeft, Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { CustomTextRenderer } from './CustomTextRenderer';
import { getChapterPages, findPageIndex, PageItem } from '@/constants/bigbook/content';

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
  const currentOffsetYRef = useRef<number>(0);

  // Measure the anchor against the ScrollView and correct if needed (Android-only)
  const verifyAndCorrectPosition = () => {
    if (Platform.OS !== 'android' || !targetPageNumber || !scrollViewRef.current) return;
    
    const anchor: any = pageRefs.current[`page-${targetPageNumber}`];
    if (!anchor) {
      console.log(`🔍 Android: Anchor not found for page ${targetPageNumber}`);
      return;
    }
    
    const scrollNode: any = (scrollViewRef.current as any).getInnerViewNode?.();
    if (!scrollNode || typeof anchor.measureLayout !== 'function') {
      console.log(`🔍 Android: ScrollNode or measureLayout not available`);
      return;
    }
    
    try {
      anchor.measureLayout(
        scrollNode,
        (_x: number, y: number) => {
          const tolerance = 15;
          const PAGE_START_OFFSET = -10;
          const desiredY = Math.max(0, y + PAGE_START_OFFSET);
          const cur = currentOffsetYRef.current || 0;
          
          if (Math.abs(cur - desiredY) > tolerance && scrollViewRef.current) {
            console.log(`📍 Android correction: localY=${y} cur=${cur} → desiredY=${desiredY}`);
            scrollViewRef.current.scrollTo({ y: desiredY, animated: false });
            currentOffsetYRef.current = desiredY;
          }
        },
        () => {
          console.log(`🔍 Android: measureLayout failed`);
        }
      );
    } catch (e) {
      console.log(`🚨 Android: measureLayout error:`, e);
    }
  };



  const [targetPage, setTargetPage] = useState('');
  
  // FlatList data for Android
  const [flatListData, setFlatListData] = useState<PageItem[]>([]);
  const flatListRef = useRef<FlatList>(null);

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

  // Prepare FlatList data for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('🔍 Android: Preparing FlatList data for section:', sectionId);
      const pages = getChapterPages(sectionId);
      console.log('🔍 Android: Got pages:', pages.length, 'pages');
      setFlatListData(pages);
    }
  }, [sectionId]);

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

  // Robust scroll to known y position with retries (tuned for Android)
  const scrollToTargetY = (attempt = 1) => {
    // Android: use FlatList scrollToIndex
    if (Platform.OS === 'android' && targetPageNumber && flatListRef.current) {
      const targetIndex = findPageIndex(sectionId, parseInt(targetPageNumber, 10));
      if (targetIndex >= 0) {
        console.log(`📍 Android: Scrolling to page ${targetPageNumber} at index ${targetIndex}`);
        flatListRef.current.scrollToIndex({ 
          index: targetIndex, 
          animated: true,
          viewPosition: 0 // 0 = top, 0.5 = center, 1 = bottom
        });
        return;
      }
    }
    
    // iOS: use existing ScrollView approach
    if (targetPageNumber && typeof pageYPositions.current[`page-${targetPageNumber}`] === 'number' && scrollViewRef.current) {
      const y = pageYPositions.current[`page-${targetPageNumber}`];
      console.log(`📍 iOS: Scrolling to cached Y for page ${targetPageNumber}: y=${y} (attempt ${attempt})`);
      if (y >= 0) {
        const PAGE_START_OFFSET = -5;
        const targetY = Math.max(0, y + PAGE_START_OFFSET);
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
        currentOffsetYRef.current = targetY;
        return;
      }
    }
    
    // Retry logic for iOS
    const maxAttempts = 8;
    const delayMs = 150;
    if (attempt < maxAttempts) {
      setTimeout(() => scrollToTargetY(attempt + 1), delayMs);
    } else {
      console.warn(`📍 Failed to obtain Y for page ${targetPageNumber} after ${attempt} attempts`);
    }
  };

  useEffect(() => {
    console.log('📍 MarkdownReader useEffect:', { targetPageNumber, initialScrollPosition });
    if (targetPageNumber) {
      if (Platform.OS === 'android') {
        // Android: use shorter delay for FlatList
        setTimeout(() => scrollToTargetY(), 100);
      } else {
        // iOS: use existing delay for ScrollView
        setTimeout(() => scrollToTargetY(), 100);
      }
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
      
      {Platform.OS === 'android' ? (
        // Android: Use FlatList for reliable scrolling
        flatListData && flatListData.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={flatListData}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.pageNumber}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.pageItem}>
                {item.isPageMarker ? (
                  <Text style={styles.pageMarker}>— Page {item.pageNumber} —</Text>
                ) : (
                  <CustomTextRenderer 
                    content={item.content}
                    searchTerm={searchHighlight?.query}
                    style={styles.textContent}
                    onPageRef={(pageNumber, ref) => {
                      if (ref) {
                        pageRefs.current[`page-${pageNumber}`] = ref;
                      }
                    }}
                    getScrollViewNode={() => null}
                    onPageLayout={(pageNumber, y) => {
                      pageYPositions.current[`page-${pageNumber}`] = y;
                    }}
                  />
                )}
              </View>
            )}
          />
        ) : (
          // Fallback to ScrollView if FlatList data not ready
          <ScrollView 
            ref={scrollViewRef}
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            onScroll={(e: any) => {
              currentOffsetYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
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
        )
      ) : (
        // iOS: Use existing ScrollView approach
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          onScroll={(e: any) => {
            currentOffsetYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
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
      )}
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
  },
  pageItem: {
    marginBottom: 16,
  },
  pageMarker: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    textAlign: 'center',
    marginVertical: 8,
    fontStyle: 'italic',
  },
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