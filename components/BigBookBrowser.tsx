import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Keyboard,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  FileText,
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

import Colors from "@/constants/colors";
import { bigBookData } from "@/constants/bigbook/data";
import { allMarkdownContent, markdownContent } from "@/constants/bigbook/content";
import { searchBigBookContentEnhanced, EnhancedSearchResult, navigateToPageWithHighlight } from "@/constants/bigbook";

// Extended interface for search highlight with match context
interface ExtendedSearchHighlight {
  query: string;
  position: number;
  length: number;
  matchContext?: {
    before: string;
    match: string;
    after: string;
  };
}

import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { BigBookCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";

import PDFViewer from "@/components/PDFViewer";
import MarkdownReader from "./MarkdownReader";
import ScreenContainer from "./ScreenContainer";
import BigBookSearchBar from "./BigBookSearchBar";
import BigBookSearchResults from "./BigBookSearchResults";
import PageNumberInput from "./PageNumberInput";

const SectionItem = ({ section, categoryId, onOpenContent }: { 
  section: BigBookSection; 
  categoryId: string; 
  onOpenContent: (section: BigBookSection) => void 
}) => {
  const { addToRecent } = useBigBookStore();

  const handlePress = () => {
    addToRecent(section.id, section.title, section.url);
    onOpenContent(section);
  };

  return (
    <TouchableOpacity
      style={styles.sectionItem}
      onPress={handlePress}
      testID={`section-${section.id}`}
      activeOpacity={0.7}
    >
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.description && (
          <Text style={styles.sectionDescription}>{section.description}</Text>
        )}
      </View>
      <View style={styles.sectionIcons}>
        {allMarkdownContent[section.id] ? (
          <FileText size={20} color={Colors.light.muted} />
        ) : (
          <ExternalLink size={20} color={Colors.light.muted} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const CategorySection = ({ category, onOpenContent }: { 
  category: BigBookCategory; 
  onOpenContent: (section: BigBookSection) => void 
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setExpanded(!expanded)}
        testID={`category-${category.id}`}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        {expanded ? (
          <ChevronDown size={20} color={Colors.light.muted} />
        ) : (
          <ChevronRight size={20} color={Colors.light.muted} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionsContainer}>
          {category.sections.map((section) => (
            <SectionItem 
              key={section.id} 
              section={section} 
              categoryId={category.id} 
              onOpenContent={onOpenContent} 
            />
          ))}
        </View>
      )}
    </View>
  );
};

function BigBookBrowserContent() {
  // Component is rendering normally
  
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [currentPdf, setCurrentPdf] = useState("");
  const [markdownReaderVisible, setMarkdownReaderVisible] = useState(false);
  const [currentMarkdown, setCurrentMarkdown] = useState<{
    content: string;
    title: string;
    id: string;
    pages?: string;
    initialScrollPosition?: number;
    targetPageNumber?: string;
    searchHighlight?: {
      query: string;
      position: number;
      length: number;
    };
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EnhancedSearchResult[]>([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);
  const [clearSearch, setClearSearch] = useState(false);
  const [pageInputVisible, setPageInputVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Safety mechanism to ensure modals are closed on component mount
  useEffect(() => {
    console.log('🟢 BigBookBrowser: useEffect mount - ensuring modals are closed');
    console.log('🔍 Available content keys:', Object.keys(allMarkdownContent));
    console.log('🔍 appendix-1 content exists:', !!allMarkdownContent['appendix-1']);
    console.log('🔍 appendix-1 content length:', allMarkdownContent['appendix-1']?.length || 0);
    console.log('🔍 appendix-1 content preview:', allMarkdownContent['appendix-1']?.substring(0, 200) || 'NO CONTENT');
    setPdfViewerVisible(false);
    setMarkdownReaderVisible(false);
  }, []);

  // Debug logging for modal states
  useEffect(() => {
    console.log('🟢 BigBookBrowser: Modal states changed:', { pdfViewerVisible, markdownReaderVisible });
  }, [pdfViewerVisible, markdownReaderVisible]);

  // Keyboard visibility effect
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);





  const handleOpenContent = useCallback((section: BigBookSection) => {
    console.log('🔍 handleOpenContent called with section:', {
      id: section.id,
      title: section.title,
      hasContent: !!allMarkdownContent[section.id],
      contentLength: allMarkdownContent[section.id]?.length || 0
    });
    
    // Check if we have markdown content for this section
    if (allMarkdownContent[section.id]) {
      console.log('✅ Opening markdown content for:', section.id);
      setCurrentMarkdown({
        content: allMarkdownContent[section.id],
        title: section.title,
        id: section.id,
        pages: section.pages
      });
      setMarkdownReaderVisible(true);
    } else {
      console.log('❌ No markdown content found for:', section.id, 'opening PDF instead');
      setCurrentPdf(section.url);
      setPdfViewerVisible(true);
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowingSearchResults(false);
      return;
    }
    
    // Simple unified search - use whole words for everything
    const results = searchBigBookContentEnhanced(query, {
      caseSensitive: false,
      wholeWordsOnly: true, // Always use whole word matching
      includePageNumbers: true
    });
    
    setSearchResults(results);
    setShowingSearchResults(true);
  }, []);

  const handleSearchResultPress = useCallback((result: EnhancedSearchResult) => {
    console.log('🔍 Search Result Clicked:', {
      title: result.title,
      pageNumber: result.pageNumber,
      pageNumberNumeric: result.pageNumberNumeric,
      chapterId: result.chapterInfo.id
    });
    
    if (Platform.OS === 'android') {
      // Android: Load entire chapter content with all search term instances highlighted
      const chapterId = result.chapterInfo.id;
      const chapterSection = bigBookData
        .flatMap(cat => cat.sections)
        .find(sec => sec.id === chapterId);
      
      if (chapterSection) {
        console.log('🔍 Android: Loading entire chapter:', chapterSection.title);
        
        // Get the chapter content
        const chapterContent = markdownContent[chapterId];
        
        if (chapterContent) {
          // Find all occurrences of the search term in the chapter
          const escapedTerm = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
          const matches: { index: number, length: number }[] = [];
          let match;
          
          while ((match = regex.exec(chapterContent)) !== null) {
            matches.push({ index: match.index, length: match[0].length });
          }
          
          console.log(`🔍 Android: Found ${matches.length} matches in chapter`);
          
          // Find the first match in the chapter
          const firstMatchPosition = matches.length > 0 ? matches[0].index : 0;
          
          setCurrentMarkdown({
            content: chapterContent,
            title: chapterSection.title,
            id: chapterId,
            initialScrollPosition: 0,
            targetPageNumber: String(result.pageNumber),
            searchHighlight: {
              query: searchQuery,
              position: 0, // Start from beginning, don't auto-scroll
              length: searchQuery.length,
              matchContext: result.matchContext
            } as ExtendedSearchHighlight
          });
          setMarkdownReaderVisible(true);
        } else {
          console.log('❌ Android: Chapter content not found for:', chapterId);
        }
      } else {
        console.log('❌ Android: Chapter not found for:', chapterId);
      }
    } else {
      // iOS: Keep existing behavior
      // Pass the Roman numeral string or Arabic number directly
      const navigationResult = navigateToPageWithHighlight(result.pageNumber, searchQuery);
      if (navigationResult && navigationResult.success) {
        setCurrentMarkdown({
          content: navigationResult.content,
          // Use the chapter title instead of 'Big Book - Page XX'
          title: result.title,
          id: 'search-navigation',
          initialScrollPosition: navigationResult.scrollPosition || 0,
          targetPageNumber: navigationResult.targetPageMarker || String(result.pageNumber),
          searchHighlight: {
            query: searchQuery,
            position: 0,
            length: searchQuery.length
          }
        });
        setMarkdownReaderVisible(true);
      } else {
        console.log('❌ Navigation failed for page:', result.pageNumber);
      }
    }
    // Don't hide search results - let user navigate back to them
    // setShowingSearchResults(false);
  }, [searchQuery, bigBookData]);

  const handleSearchDone = useCallback(() => {
    setShowingSearchResults(false);
    setSearchResults([]);
    setSearchQuery('');
    setClearSearch(true);
    // Reset clearSearch after a brief moment
    setTimeout(() => setClearSearch(false), 100);
  }, []);

  const handleLastPagePress = useCallback((pageNumber: number) => {
    console.log('🟢 BigBookBrowser: Jumping to last page:', pageNumber);
    
    // Validate page number (same validation as handleSubmitPage)
    if (pageNumber < 1 || (pageNumber > 164 && pageNumber < 567) || pageNumber > 568) {
      // If invalid, treat as page 1 (no toast as per requirements)
      pageNumber = 1;
    }
    
    const navigationResult = navigateToPageWithHighlight(pageNumber);
    if (navigationResult && navigationResult.success) {
      const chapter = bigBookData.flatMap(cat => cat.sections).find(sec => sec.pages && pageNumber >= parseInt(sec.pages.split('-')[0], 10) && pageNumber <= parseInt(sec.pages.split('-')[1], 10));
      setCurrentMarkdown({
        content: navigationResult.content,
        title: chapter ? chapter.title : `Big Book`,
        id: 'last-page-navigation',
        initialScrollPosition: navigationResult.scrollPosition || 0,
        targetPageNumber: navigationResult.targetPageMarker || String(pageNumber),
        searchHighlight: {
          query: '',
          position: 0,
          length: 0
        }
      });
      setMarkdownReaderVisible(true);
    } else {
      // If page not found, treat as page 1 (no toast as per requirements)
      const fallbackResult = navigateToPageWithHighlight(1);
      if (fallbackResult && fallbackResult.success) {
        const chapter = bigBookData.flatMap(cat => cat.sections).find(sec => sec.pages && 1 >= parseInt(sec.pages.split('-')[0], 10) && 1 <= parseInt(sec.pages.split('-')[1], 10));
        setCurrentMarkdown({
          content: fallbackResult.content,
          title: chapter ? chapter.title : `Big Book`,
          id: 'last-page-navigation',
          initialScrollPosition: fallbackResult.scrollPosition || 0,
          targetPageNumber: fallbackResult.targetPageMarker || '1',
          searchHighlight: {
            query: '',
            position: 0,
            length: 0
          }
        });
        setMarkdownReaderVisible(true);
      }
    }
  }, []);

  const handleGoToPage = useCallback(() => {
    console.log('🟢 BigBookBrowser: Go to Page button pressed');
    setPageInputVisible(true);
  }, []);

  const handleSubmitPage = useCallback((pageInput: string) => {
    setPageInputVisible(false);
    if (!pageInput || !pageInput.trim()) return;
    const pageNum = parseInt(pageInput.trim(), 10);
    if (isNaN(pageNum) || (pageNum < 1 || (pageNum > 164 && pageNum < 567) || pageNum > 568)) {
      Alert.alert("Invalid Page", "Please enter a valid page number between 1-164 or 567-568.");
      return;
    }
    const navigationResult = navigateToPageWithHighlight(pageNum);
    if (navigationResult && navigationResult.success) {
      const chapter = bigBookData.flatMap(cat => cat.sections).find(sec => sec.pages && pageNum >= parseInt(sec.pages.split('-')[0], 10) && pageNum <= parseInt(sec.pages.split('-')[1], 10));
      setCurrentMarkdown({
        content: navigationResult.content,
        title: chapter ? chapter.title : `Big Book`,
        id: 'page-navigation',
        initialScrollPosition: navigationResult.scrollPosition || 0,
        targetPageNumber: navigationResult.targetPageMarker || String(pageNum),
        searchHighlight: {
          query: '',
          position: 0,
          length: 0
        }
      });
      setMarkdownReaderVisible(true);
    } else {
      Alert.alert("Page Not Found", `Could not find page ${pageNum}. Please try a different page number between 1 and 164.`);
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
        pointerEvents="none"
      />
      
      <View style={styles.content}>
        <View style={styles.mainContent}>
          <View style={styles.header}>
            {Platform.OS !== 'android' && (
              <Text style={styles.title}>Alcoholics Anonymous</Text>
            )}
            <Text style={styles.subtitle}>The basic textbook for the AA program.</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchBarContainer}>
              <BigBookSearchBar onSearch={handleSearch} clearSearch={clearSearch} />
            </View>
            {Platform.OS !== 'android' && (
              <TouchableOpacity 
                style={styles.goToPageButton}
                onPress={handleGoToPage}
                onPressIn={() => console.log('🟢 BigBookBrowser: Go to Page onPressIn')}
                onPressOut={() => console.log('🟢 BigBookBrowser: Go to Page onPressOut')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.goToPageButtonText}>Go to Page</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {showingSearchResults ? (
            <BigBookSearchResults 
              results={searchResults} 
              onResultPress={handleSearchResultPress}
              onDone={handleSearchDone}
            />
          ) : (
            <ScrollView style={styles.scrollView}>
              {bigBookData.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  onOpenContent={handleOpenContent}
                />
              ))}
            </ScrollView>
          )}
        </View>
        
        {/* Edition note removed per request */}
      </View>

      <Modal
        visible={pdfViewerVisible}
        onRequestClose={() => {
          console.log('PDF Modal onRequestClose called');
          setPdfViewerVisible(false);
        }}
        animationType="slide"
        transparent={false}
      >
        <PDFViewer
          url={currentPdf}
          title={"Alcoholics Anonymous"}
          onClose={() => {
            console.log('PDF Viewer onClose called');
            setPdfViewerVisible(false);
          }}
        />
      </Modal>

      <Modal
        visible={markdownReaderVisible}
        onRequestClose={() => {
          console.log('Markdown Modal onRequestClose called');
          setMarkdownReaderVisible(false);
        }}
        animationType="slide"
        transparent={false}
      >
        {currentMarkdown && (
          <MarkdownReader
            content={currentMarkdown.content}
            title={currentMarkdown.title}
            onClose={() => {
              console.log('Markdown Reader onClose called');
              setMarkdownReaderVisible(false);
            }}
            sectionId={currentMarkdown.id}
            searchQuery={searchQuery}
            searchHighlight={currentMarkdown.searchHighlight}
            initialScrollPosition={currentMarkdown.initialScrollPosition}
            targetPageNumber={currentMarkdown.targetPageNumber}
          />
        )}
      </Modal>

      {Platform.OS !== 'android' && (
        <PageNumberInput
          visible={pageInputVisible}
          onClose={() => setPageInputVisible(false)}
          onSubmit={handleSubmitPage}
          onLastPagePress={handleLastPagePress}
        />
      )}
    </View>
  );
}

export default function BigBookBrowser() {
  console.log('🟢 BigBookBrowser: Main wrapper component rendering');
  return (
    <BigBookStoreProvider>
      <BigBookBrowserContent />
    </BigBookStoreProvider>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight("bold", true),
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.muted,
    marginBottom: 2,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600"),
    color: Colors.light.text,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  sectionsContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  sectionIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkButton: {
    marginRight: 12,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
    marginRight: 12,
  },
  goToPageButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  goToPageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
});