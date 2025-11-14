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
  SafeAreaView,
} from 'react-native';
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
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookBookmarks } from '@/hooks/use-bigbook-bookmarks';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { getChapterMeta } from '@/constants/bigbook-v2/metadata';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { BigBookParagraph } from './BigBookParagraph';
import { BigBookBookmarkDialog } from './BigBookBookmarkDialog';
import { HighlightColorPicker } from './HighlightColorPicker';
import { HighlightColorToast } from './HighlightColorToast';
import { HighlightEditMenu } from './HighlightEditMenu';
import { SearchResult } from '@/hooks/use-bigbook-content';
import { HighlightColor, BigBookHighlight } from '@/types/bigbook-v2';

// Map highlight colors to icon colors
function getColorForHighlighter(color: HighlightColor): string {
  const colorMap: Record<HighlightColor, string> = {
    [HighlightColor.YELLOW]: '#FBBF24', // Lighter Yellow
    [HighlightColor.GREEN]: '#10B981', // Emerald
    [HighlightColor.BLUE]: '#3B82F6', // Blue
    [HighlightColor.PINK]: '#EC4899', // Pink
  };
  return colorMap[color];
}

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
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphRefs = useRef<Map<string, View>>(new Map());
  const paragraphPositions = useRef<Map<string, { y: number; height: number; pageNumber: number }>>(new Map());
  const activeScrollTargetRef = useRef<string | null>(scrollToParagraphId || null);
  
  // Bookmark management
  const { 
    bookmarks,
    addBookmark, 
    deleteBookmark, 
    updateBookmarkLabel, 
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

  // Highlight mode state
  const [highlightMode, setHighlightMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showColorToast, setShowColorToast] = useState(false);
  // Default to yellow if user has not explicitly chosen a color
  const [selectedColor, setSelectedColor] = useState<HighlightColor | null>(HighlightColor.YELLOW);
  const [pendingSentence, setPendingSentence] = useState<{
    paragraphId: string;
    sentenceIndex: number;
    sentenceText: string;
  } | null>(null);
  const [showHighlightEditMenu, setShowHighlightEditMenu] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<BigBookHighlight | null>(null);

  // Font size state (replacing pinch-to-zoom)
  const [fontSize, setFontSize] = useState(18);
  const baseFontSize = 18;
  
  const increaseFontSize = useCallback(() => {
    setFontSize(prev => Math.min(prev + 2, 28));
  }, []);
  
  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => Math.max(prev - 2, 12));
  }, []);
  
  // Double-tap to reset to default font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      setFontSize(baseFontSize);
    })
    .runOnJS(true), [baseFontSize]);

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

  // Bookmark handlers
  const handleBookmarkPress = () => {
    if (!currentPageNumber || !currentChapterId) return;
    setShowBookmarkDialog(true);
  };

  const handleSaveBookmark = async (label: string) => {
    if (!currentPageNumber || !currentChapterId) return;
    
    try {
      const existingBookmark = getBookmarkForPage(currentPageNumber);
      
      if (existingBookmark) {
        // Update existing bookmark
        await updateBookmarkLabel(existingBookmark.id, label);
      } else {
        // Add new bookmark
        await addBookmark(currentPageNumber, currentChapterId, label);
      }
    } catch (error) {
      console.error('[BigBookReader] Error saving bookmark:', error);
    }
  };

  const handleRemoveBookmark = async () => {
    if (!currentPageNumber) return;
    
    try {
      const existingBookmark = getBookmarkForPage(currentPageNumber);
      if (existingBookmark) {
        await deleteBookmark(existingBookmark.id);
      }
    } catch (error) {
      console.error('[BigBookReader] Error removing bookmark:', error);
    }
  };

  // Check if current page is bookmarked
  const currentPageBookmark = currentPageNumber ? getBookmarkForPage(currentPageNumber) : undefined;
  const isCurrentPageBookmarked = currentPageNumber ? isPageBookmarked(currentPageNumber) : false;

  // Highlight handlers
  const handleToggleHighlightMode = () => {
    console.log('[BigBookReader] Toggling highlight mode, current:', highlightMode);
    if (highlightMode) {
      // Exit highlight mode but retain the last selected color
      setHighlightMode(false);
      setPendingSentence(null);
      return;
    }
    // Ensure a default color (yellow) is set when turning ON
    if (!selectedColor) {
      setSelectedColor(HighlightColor.YELLOW);
    }
    setHighlightMode(true);
  };

  const handleLongPressHighlightIcon = () => {
    console.log('[BigBookReader] Long press highlight icon - showing color toast');
    setShowColorToast(true);
  };

  const handleCloseColorPicker = () => {
    // Close color picker; retain the currently selected color
    setShowColorPicker(false);
    setPendingSentence(null);
  };

  const handleCloseColorToast = () => {
    setShowColorToast(false);
  };

  const handleSentenceTap = useCallback((paragraphId: string, sentenceIndex: number, sentenceText: string) => {
    console.log('[BigBookReader] Sentence tapped:', { paragraphId, sentenceIndex, sentenceText });
    
    if (!selectedColor) {
      // No color selected yet - store sentence and wait for color selection
      setPendingSentence({ paragraphId, sentenceIndex, sentenceText });
      setShowColorPicker(true);
      return;
    }

    // Color already selected - create highlight immediately
    createHighlight(paragraphId, sentenceIndex, sentenceText, selectedColor);
  }, [selectedColor, currentChapterId]);

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

  const handleColorSelect = (color: HighlightColor) => {
    console.log('[BigBookReader] Color selected:', color);
    setSelectedColor(color);
    
    // Close the color picker so user can see the text
    setShowColorPicker(false);

    // If there's a pending sentence, highlight it now
    if (pendingSentence) {
      createHighlight(
        pendingSentence.paragraphId,
        pendingSentence.sentenceIndex,
        pendingSentence.sentenceText,
        color
      );
      setPendingSentence(null);
    }
  };

  const handleColorSelectFromToast = (color: HighlightColor) => {
    console.log('[BigBookReader] Color selected from toast:', color);
    setSelectedColor(color);
    setShowColorToast(false);
    // Keep current highlightMode state unchanged; color persists for future toggles
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
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Loading...</Text>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chapter...</Text>
          </View>
        </SafeAreaView>
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
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Row 1: Back button, Title, and Font Size Controls */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={Colors.light.tint} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {currentChapter.title}
            </Text>
          </View>
          
          {/* Font Size Controls */}
          <View style={styles.headerFontSizeControls}>
            <TouchableOpacity 
              onPress={decreaseFontSize}
              style={styles.headerFontSizeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Type size={16} color={Colors.light.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={increaseFontSize}
              style={styles.headerFontSizeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Type size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Row 2: Page Number & Actions */}
        <View style={styles.headerBottomRow}>
          <LinearGradient
            colors={['#c9def6', '#d3e6ef']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {/* Left: Page Number */}
          {currentPageNumber && (
            <Text style={styles.headerPageNumber}>
              Page {formatPageNumber(
                currentPageNumber, 
                getChapterMeta(currentChapterId)?.useRomanNumerals || false
              )}
            </Text>
          )}

          {/* Right: Action Icons */}
          <View style={styles.headerActions}>
            <View style={styles.headerActionButtonWrapper}>
              <TouchableOpacity 
                onPress={handleToggleHighlightMode}
                onLongPress={handleLongPressHighlightIcon}
                delayLongPress={500}
                activeOpacity={0.8}
                style={styles.headerActionButton}
              >
                <Highlighter 
                  size={18} 
                  color={getColorForHighlighter(selectedColor || HighlightColor.YELLOW)}
                  fill={highlightMode ? getColorForHighlighter(selectedColor || HighlightColor.YELLOW) : 'transparent'}
                />
                <Text style={styles.headerActionText}>Highlight</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerActionButtonWrapper}>
              <TouchableOpacity 
                onPress={handleBookmarkPress}
                activeOpacity={0.8}
                style={styles.headerActionButton}
              >
                <BookmarkIcon 
                  size={18} 
                  color="#19a0b8"
                  fill={isCurrentPageBookmarked ? "#19a0b8" : 'transparent'}
                />
                <Text style={styles.headerActionText}>Bookmark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>


      {/* Content */}
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 1]}
          pointerEvents="none"
        />
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
          <ChevronLeft size={20} color={Colors.light.tint} />
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
          <ChevronRight size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      {/* Bookmark Dialog */}
      {currentChapter && currentPageNumber && (
        <BigBookBookmarkDialog
          visible={showBookmarkDialog}
          onClose={() => setShowBookmarkDialog(false)}
          pageNumber={currentPageNumber}
          chapterTitle={currentChapter.title}
          existingLabel={currentPageBookmark?.label}
          isEditing={isCurrentPageBookmarked}
          onSave={handleSaveBookmark}
          onRemove={isCurrentPageBookmarked ? handleRemoveBookmark : undefined}
        />
      )}

      {/* Highlight Color Picker */}
      <HighlightColorPicker
        visible={showColorPicker}
        onSelectColor={handleColorSelect}
        onClose={handleCloseColorPicker}
      />

      {/* Highlight Color Toast */}
      <HighlightColorToast
        visible={showColorToast}
        onSelectColor={handleColorSelectFromToast}
        onClose={handleCloseColorToast}
      />

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

    </SafeAreaView>
  </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    borderBottomWidth: 0, // Removed bottom border line
    backgroundColor: '#FFFFFF', // Explicitly set to white
    paddingTop: 8,
    paddingBottom: 0, 
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: Colors.light.tint,
    marginLeft: 4,
    fontWeight: '400',
  },
  headerSpacer: {
    width: 80, // Approximate width of back button to balance the title
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    textAlign: 'center',
  },
  headerPageNumber: {
    fontSize: 14,
    fontWeight: adjustFontWeight('500'),
    color: Colors.light.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButtonWrapper: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#02131B',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.27,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerActionText: {
    fontSize: 14,
    color: '#19a0b8',
    fontWeight: '500',
  },
  headerFontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
    height: 44,
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
    color: Colors.light.tint,
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

