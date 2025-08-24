import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
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
import { allMarkdownContent } from "@/constants/bigbook/content";
import { searchBigBookContentEnhanced, EnhancedSearchResult, navigateToPageWithHighlight } from "@/constants/bigbook";

import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { BigBookCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";

import PDFViewer from "@/components/PDFViewer";
import MarkdownReader from "./MarkdownReader";
import ScreenContainer from "./ScreenContainer";
import BigBookSearchBar from "./BigBookSearchBar";
import BigBookSearchResults from "./BigBookSearchResults";

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
    targetPageNumber?: number;
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

  // Safety mechanism to ensure modals are closed on component mount
  useEffect(() => {
    console.log('🟢 BigBookBrowser: useEffect mount - ensuring modals are closed');
    setPdfViewerVisible(false);
    setMarkdownReaderVisible(false);
  }, []);

  // Debug logging for modal states
  useEffect(() => {
    console.log('🟢 BigBookBrowser: Modal states changed:', { pdfViewerVisible, markdownReaderVisible });
  }, [pdfViewerVisible, markdownReaderVisible]);





  const handleOpenContent = useCallback((section: BigBookSection) => {
    // Check if we have markdown content for this section
    if (allMarkdownContent[section.id]) {
      setCurrentMarkdown({
        content: allMarkdownContent[section.id],
        title: section.title,
        id: section.id,
        pages: section.pages
      });
      setMarkdownReaderVisible(true);
    } else {
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
    // Open the full chapter content instead of just the page
    const chapterContent = allMarkdownContent[result.chapterInfo.id];
    if (chapterContent) {
      setCurrentMarkdown({
        content: chapterContent, // Use full chapter content for scrolling
        title: result.chapterInfo.title,
        id: result.chapterInfo.id,
        targetPageNumber: result.pageNumberNumeric,
        searchHighlight: {
          query: searchQuery,
          position: 0,
          length: searchQuery.length
        }
      });
      setMarkdownReaderVisible(true);
    }
    // Don't hide search results - let user navigate back to them
    // setShowingSearchResults(false);
  }, [searchQuery]);

  const handleSearchDone = useCallback(() => {
    setShowingSearchResults(false);
    setSearchResults([]);
    setSearchQuery('');
    setClearSearch(true);
    // Reset clearSearch after a brief moment
    setTimeout(() => setClearSearch(false), 100);
  }, []);

  const handleGoToPage = useCallback(() => {
    console.log('🟢 BigBookBrowser: Go to Page button pressed'); // Debug log
    Alert.prompt(
      "Go to Page",
      "Enter page number (1-184)", // 1st edition goes up to page 184
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Go", 
          onPress: (pageInput) => {
            if (pageInput && pageInput.trim()) {
              const pageNum = pageInput.trim();
              const navigationResult = navigateToPageWithHighlight(pageNum);
              
              if (navigationResult && navigationResult.success) {
                // Open the content with the page highlighted
                setCurrentMarkdown({
                  content: navigationResult.content,
                  title: `Page ${pageNum}`,
                  id: 'page-navigation',
                  searchHighlight: {
                    query: '',
                    position: 0,
                    length: 0
                  }
                });
                setMarkdownReaderVisible(true);
              } else {
                Alert.alert("Page Not Found", `Could not find page ${pageNum}. Please try a different page number.`);
              }
            }
          }
        }
      ],
      "plain-text",
      "",
      "numeric"
    );
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
      


      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <BigBookSearchBar onSearch={handleSearch} clearSearch={clearSearch} />
        </View>
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
    ...adjustFontWeight("600"),
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
    ...adjustFontWeight("500"),
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
    paddingTop: 20,
    paddingBottom: 16,
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