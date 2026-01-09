/**
 * Big Book Reader Component
 * 
 * Full-screen modal reader that displays chapter content with:
 * - Chapter navigation
 * - Paragraph rendering with highlights/bookmarks
 * - Search functionality
 * - Page navigation
 * - Highlights and Bookmarks lists
 * - Scroll to specific paragraphs
 * 
 * Phase 4: Displays content and existing highlights/bookmarks.
 * Phase 5: Text selection and creation of new highlights/bookmarks.
 * Phase 6: Navigation features (highlights list, bookmarks list, go to page).
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Bookmark as BookmarkIcon,
  Highlighter,
  Type,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { BigBookParagraph } from './BigBookParagraph';
import { HighlightEditMenu } from './HighlightEditMenu';
import { SearchResult } from '@/hooks/use-bigbook-content';
import { HighlightColor, BigBookHighlight } from '@/types/bigbook-v2';

// Fixed highlight color (yellow)
const HIGHLIGHT_COLOR = HighlightColor.YELLOW;
const HIGHLIGHT_ICON_COLOR = '#FBBF24';

interface BigBookReaderProps {
  visible: boolean;
  initialChapterId: string;
  scrollToParagraphId?: string | null;
  searchTerm?: string | null;
  onClose: () => void;
}

export function BigBookReader({ visible, initialChapterId, scrollToParagraphId, searchTerm, onClose }: BigBookReaderProps) {
  const {
    currentChapter,
    currentChapterId,
    loadChapter,
    goToNextChapter,
    goToPreviousChapter,
    searchContent,
    goToPage,
  } = useBigBookContent();

  const insets = useSafeAreaInsets();

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[BigBookReader] Hardware back pressed, closing reader');
      onClose();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphRefs = useRef<Map<string, View>>(new Map());
  const paragraphPositions = useRef<Map<string, { y: number; height: number; pageNumber: number }>>(new Map());
  const activeScrollTargetRef = useRef<string | null>(scrollToParagraphId || null);
  
  // Bookmark management
  const { 
    bookmarks,
    addBookmark, 
    deleteBookmark, 
    isPageBookmarked, 
    getBookmarkForPage,
    isLoading: bookmarksLoading 
  } = useBigBookBookmarks();

  // Highlight management
  const {
    addHighlight,
    updateHighlightNote,
    deleteHighlight,
    getHighlightById,
  } = useBigBookHighlights();

  // Highlight mode state (simplified - always uses yellow)
  const [highlightMode, setHighlightMode] = useState(false);
  const [showHighlightEditMenu, setShowHighlightEditMenu] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<BigBookHighlight | null>(null);

  // Use global text settings
  const { fontSize, lineHeight, setFontSize, minFontSize, maxFontSize, defaultFontSize } = useTextSettings();
  
  const increaseFontSize = useCallback(() => {
    setFontSize(Math.min(fontSize + 2, maxFontSize));
  }, [fontSize, maxFontSize, setFontSize]);
  
  const decreaseFontSize = useCallback(() => {
    setFontSize(Math.max(fontSize - 2, minFontSize));
  }, [fontSize, minFontSize, setFontSize]);
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      setFontSize(defaultFontSize);
    })
    .runOnJS(true), [defaultFontSize, setFontSize]);

  // Load initial chapter
  useEffect(() => {
    loadChapter(initialChapterId);
  }, [initialChapterId, loadChapter]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = searchContent(query);
    setSearchResults(results);
  }, [searchContent]);

  // Handle search result selection
  const handleSearchResultPress = useCallback((result: SearchResult) => {
    // Load the chapter containing the result
    loadChapter(result.chapterId);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
    
    // TODO: Scroll to specific paragraph (Phase 5)
    // For now, just load the chapter
  }, [loadChapter]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Scroll to specific paragraph
  const scrollToParagraph = useCallback((paragraphId: string) => {
    if (!paragraphId) return;
    activeScrollTargetRef.current = paragraphId;
    const paragraphView = paragraphRefs.current.get(paragraphId);
    
    if (paragraphView && scrollViewRef.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        paragraphView.measureLayout(
          scrollViewRef.current as any,
          (x, y, width, height) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20), // 20px offset from top
              animated: true
            });
          },
          (error) => console.error('[BigBookReader] Measure error:', error)
        );
      }, 100);
    }
  }, []);

  // Scroll to top when chapter changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentChapterId]);

  // Handle scroll to paragraph on mount (from navigation)
  useEffect(() => {
    if (scrollToParagraphId && currentChapter) {
      console.log('[BigBookReader] Scrolling to paragraph on mount:', scrollToParagraphId);
      activeScrollTargetRef.current = scrollToParagraphId;
      // Wait for render
      setTimeout(() => {
        scrollToParagraph(scrollToParagraphId);
      }, 200);
    }
  }, [scrollToParagraphId, currentChapter, scrollToParagraph]);

  // When font size changes, keep the active highlighted paragraph in view
  useEffect(() => {
    if (!visible) return;
    const targetParagraphId = activeScrollTargetRef.current;
    if (!targetParagraphId) return;

    const timeout = setTimeout(() => {
      scrollToParagraph(targetParagraphId);
    }, 250);

    return () => clearTimeout(timeout);
  }, [fontSize, visible, scrollToParagraph]);

  // Track current page number based on scroll position
  const handleScroll = useCallback((event: any) => {
    if (!currentChapter || paragraphPositions.current.size === 0) return;
    
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportHeight = event.nativeEvent.layoutMeasurement.height;
    const midpoint = scrollY + (viewportHeight / 3); // Check what's in upper third of screen
    
    // Find the paragraph that's currently in view at the midpoint
    let foundPageNumber: number | null = null;
    let closestDistance = Infinity;
    
    paragraphPositions.current.forEach((position, paragraphId) => {
      const distance = Math.abs(position.y - midpoint);
      
      // If this paragraph is close to the midpoint and closer than previous
      if (distance < closestDistance && position.y <= midpoint && (position.y + position.height) >= scrollY) {
        closestDistance = distance;
        foundPageNumber = position.pageNumber;
      }
    });
    
    if (foundPageNumber !== null && foundPageNumber !== currentPageNumber) {
      setCurrentPageNumber(foundPageNumber);
    }
  }, [currentChapter, currentPageNumber]);
  
  // Handle paragraph layout to track positions
  const handleParagraphLayout = useCallback((paragraphId: string, pageNumber: number, event: any) => {
    const { y, height } = event.nativeEvent.layout;
    paragraphPositions.current.set(paragraphId, { y, height, pageNumber });
  }, []);

  // Clear paragraph positions when chapter changes
  useEffect(() => {
    if (currentChapter) {
      paragraphPositions.current.clear();
      paragraphRefs.current.clear();
      setCurrentPageNumber(currentChapter.pageRange[0]);
    }
  }, [currentChapter]);

  // Bookmark handler - simple toggle (no dialog)
  const handleBookmarkPress = async () => {
    if (!currentPageNumber || !currentChapterId) return;
    
    try {
      const existingBookmark = getBookmarkForPage(currentPageNumber);
      
      if (existingBookmark) {
        // Remove existing bookmark
        await deleteBookmark(existingBookmark.id);
      } else {
        // Add new bookmark (no label)
        await addBookmark(currentPageNumber, currentChapterId, '');
      }
    } catch (error) {
      console.error('[BigBookReader] Error toggling bookmark:', error);
    }
  };

  // Check if current page is bookmarked
  const isCurrentPageBookmarked = currentPageNumber ? isPageBookmarked(currentPageNumber) : false;

  // Highlight handlers (simplified - always uses yellow)
  const handleToggleHighlightMode = () => {
    console.log('[BigBookReader] Toggling highlight mode, current:', highlightMode);
    setHighlightMode(!highlightMode);
  };

    const handleSentenceTap = useCallback((paragraphId: string, sentenceIndex: number, sentenceText: string) => {
    console.log('[BigBookReader] Sentence tapped:', { paragraphId, sentenceIndex, sentenceText });
    // Always use yellow for highlights
    createHighlight(paragraphId, sentenceIndex, sentenceText, HIGHLIGHT_COLOR);
  }, [currentChapterId]);

  const createHighlight = async (
    paragraphId: string,
    sentenceIndex: number,
    sentenceText: string,
    color: HighlightColor
  ) => {
    try {
      console.log('[BigBookReader] Creating highlight:', { paragraphId, sentenceIndex, color });
      await addHighlight(paragraphId, currentChapterId, sentenceIndex, color, sentenceText);
    } catch (error) {
      console.error('[BigBookReader] Error creating highlight:', error);
    }
  };

  const handleHighlightTap = useCallback(async (paragraphId: string, sentenceIndex: number) => {
    console.log('[BigBookReader] Existing highlight tapped:', { paragraphId, sentenceIndex, highlightMode });
    
    // If in highlight mode, toggle the highlight (remove it)
    if (highlightMode) {
      try {
        const highlights = await getHighlightById(paragraphId, sentenceIndex);
        if (highlights.length > 0) {
          console.log('[BigBookReader] Removing highlight in toggle mode:', highlights[0].id);
          await deleteHighlight(highlights[0].id);
        }
      } catch (error) {
        console.error('[BigBookReader] Error toggling highlight:', error);
      }
    } else {
      // Not in highlight mode - show edit menu (future enhancement)
      console.log('[BigBookReader] Would show edit menu for highlight');
    }
  }, [highlightMode, getHighlightById, deleteHighlight]);

  const handleUpdateHighlightNote = async (note: string) => {
    if (!editingHighlight) return;
    
    try {
      await updateHighlightNote(editingHighlight.id, note);
      setShowHighlightEditMenu(false);
      setEditingHighlight(null);
    } catch (error) {
      console.error('[BigBookReader] Error updating highlight note:', error);
    }
  };

  const handleRemoveHighlight = async () => {
    if (!editingHighlight) return;
    
    try {
      await deleteHighlight(editingHighlight.id);
      setShowHighlightEditMenu(false);
      setEditingHighlight(null);
    } catch (error) {
      console.error('[BigBookReader] Error removing highlight:', error);
    }
  };

  if (!currentChapter) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <LinearGradient
            colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
                onPress={onClose}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Loading...</Text>
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chapter...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
      {/* Gradient Header Block */}
      <LinearGradient
        colors={['#4A6FA5', '#3D8B8B', '#45A08A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {currentChapter.title}
        </Text>
        {currentPageNumber && (
          <Text style={styles.headerPageNumber}>
            Page {formatPageNumber(
              currentPageNumber, 
              getChapterMeta(currentChapterId)?.useRomanNumerals || false
            )}
          </Text>
        )}
      </LinearGradient>

      {/* Action Row - Below header */}
      <View style={styles.actionRow}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={handleToggleHighlightMode}
            activeOpacity={0.8}
            style={styles.actionButton}
          >
            <Highlighter 
              size={18} 
              color="#3D8B8B"
              fill={highlightMode ? "#3D8B8B" : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleBookmarkPress}
            activeOpacity={0.8}
            style={styles.actionButton}
          >
            <BookmarkIcon 
              size={18} 
              color="#3D8B8B"
              fill={isCurrentPageBookmarked ? "#3D8B8B" : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        <GestureDetector gesture={doubleTapGesture}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={150}
          >
            {currentChapter.paragraphs.map((paragraph, index) => {
                const previousParagraph = index > 0 ? currentChapter.paragraphs[index - 1] : null;
                const isPageBreak = previousParagraph && previousParagraph.pageNumber !== paragraph.pageNumber;
                
                return (
                  <View
                    key={paragraph.id}
                    ref={(ref) => {
                      if (ref) {
                        paragraphRefs.current.set(paragraph.id, ref);
                      } else {
                        paragraphRefs.current.delete(paragraph.id);
                      }
                    }}
                    onLayout={(event) => handleParagraphLayout(paragraph.id, paragraph.pageNumber, event)}
                    collapsable={false}
                  >
                    <BigBookParagraph
                      paragraph={paragraph}
                      showPageNumber={false}
                      isPageBreak={isPageBreak}
                      fontSize={fontSize}
                      lineHeight={lineHeight}
                      highlightMode={highlightMode}
                      searchTerm={searchTerm || undefined}
                      onSentenceTap={(sentenceIndex, sentenceText) => 
                        handleSentenceTap(paragraph.id, sentenceIndex, sentenceText)
                      }
                      onHighlightTap={(sentenceIndex) =>
                        handleHighlightTap(paragraph.id, sentenceIndex)
                      }
                    />
                  </View>
            );
          })}
        </ScrollView>
        </GestureDetector>
      </View>

      {/* Footer with Chapter Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={goToPreviousChapter}
          style={styles.footerNavButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={20} color="#3D8B8B" />
          <Text style={styles.footerNavText}>Prev</Text>
        </TouchableOpacity>

        {getChapterMeta(currentChapterId)?.chapterNumber && (
          <Text style={styles.footerChapterNumber}>
            Chapter {getChapterMeta(currentChapterId)?.chapterNumber}
          </Text>
        )}

        <TouchableOpacity 
          onPress={goToNextChapter}
          style={styles.footerNavButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.footerNavText}>Next</Text>
          <ChevronRight size={20} color="#3D8B8B" />
        </TouchableOpacity>
      </View>



      {/* Highlight Edit Menu */}
      <HighlightEditMenu
        visible={showHighlightEditMenu}
        highlight={editingHighlight}
        onUpdateNote={handleUpdateHighlightNote}
        onRemove={handleRemoveHighlight}
        onClose={() => {
          setShowHighlightEditMenu(false);
          setEditingHighlight(null);
        }}
      />

    </View>
  </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  headerPageNumber: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
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
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  actionButton: {
    padding: 8,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerFontSizeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    height: 44,
  },
  fontSizeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  fontSizeButtonTextLarge: {
    fontSize: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  footerNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  footerNavText: {
    fontSize: 16,
    color: '#3D8B8B',
    fontWeight: '400',
  },
  footerChapterNumber: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: adjustFontWeight('500'),
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
  },
  searchResults: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.muted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border || '#E5E7EB',
  },
  searchResultChapter: {
    fontSize: 14,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.tint,
    marginBottom: 4,
  },
  searchResultText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    marginBottom: 4,
  },
  searchResultMatch: {
    backgroundColor: '#FEF08A',
    fontWeight: adjustFontWeight('600'),
  },
  searchResultMeta: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.muted,
  },
});

