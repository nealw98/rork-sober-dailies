import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Clock,
  Trash2,
  FileText,
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

import Colors from "@/constants/colors";
import { bigBookData } from "@/constants/bigbook/data";
import { allMarkdownContent } from "@/constants/bigbook/content";
import { searchBigBookContent, SearchResult } from "@/constants/bigbook";
import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { BigBookCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";
import BookSelector from "@/components/BookSelector";
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
  const { addBookmark, removeBookmark, isBookmarked, addToRecent } = useBigBookStore();

  const handlePress = () => {
    addToRecent(section.id, section.title, section.url);
    onOpenContent(section);
  };

  const toggleBookmark = () => {
    if (isBookmarked(section.id)) {
      removeBookmark(section.id);
    } else {
      addBookmark(section.id, section.title, section.url);
    }
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
        <TouchableOpacity
          onPress={toggleBookmark}
          style={styles.bookmarkButton}
          testID={`bookmark-${section.id}`}
        >
          {isBookmarked(section.id) ? (
            <BookmarkCheck size={20} color={Colors.light.tint} />
          ) : (
            <Bookmark size={20} color={Colors.light.muted} />
          )}
        </TouchableOpacity>
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
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [currentPdf, setCurrentPdf] = useState("");
  const [markdownReaderVisible, setMarkdownReaderVisible] = useState(false);
  const [currentMarkdown, setCurrentMarkdown] = useState<{
    content: string;
    title: string;
    id: string;
    pages?: string;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);

  const handleOpenContent = (section: BigBookSection) => {
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
  };

  const handleSearch = (query: string) => {
    const results = searchBigBookContent(query, 'text');
    setSearchResults(results);
    setShowingSearchResults(true);
  };

  const handleSearchResultPress = (result: SearchResult) => {
    // Find the section that contains this result
    const section = bigBookData.flatMap(cat => cat.sections).find(s => s.id === result.id);
    if (section) {
      handleOpenContent(section);
    }
    setShowingSearchResults(false);
  };

  return (
    <View style={styles.container}>
      <BookSelector activeBook="bigbook" />
      <BigBookSearchBar onSearch={handleSearch} />
      
      {showingSearchResults ? (
        <BigBookSearchResults 
          results={searchResults} 
          onResultPress={handleSearchResultPress} 
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
        onRequestClose={() => setPdfViewerVisible(false)}
        animationType="slide"
      >
        <PDFViewer
          url={currentPdf}
          onClose={() => setPdfViewerVisible(false)}
        />
      </Modal>

      <Modal
        visible={markdownReaderVisible}
        onRequestClose={() => setMarkdownReaderVisible(false)}
        animationType="slide"
      >
        {currentMarkdown && (
          <MarkdownReader
            content={currentMarkdown.content}
            title={currentMarkdown.title}
            onClose={() => setMarkdownReaderVisible(false)}
            sectionId={currentMarkdown.id}

          />
        )}
      </Modal>
    </View>
  );
}

export default function BigBookBrowser() {
  return (
    <BigBookStoreProvider>
      <BigBookBrowserContent />
    </BigBookStoreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});