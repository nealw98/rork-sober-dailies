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
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

import Colors from "@/constants/colors";
import { twelveAndTwelveData } from "@/constants/bigbook";
import { BigBookStoreProvider, useBigBookStore } from "@/hooks/use-bigbook-store";
import { TwelveAndTwelveCategory, BigBookSection } from "@/types/bigbook";
import { adjustFontWeight } from "@/constants/fonts";
import BookSelector from "@/components/BookSelector";
import PDFViewer from "@/components/PDFViewer";

const SectionItem = ({ section, categoryId, onOpenPDF }: { section: BigBookSection; categoryId: string; onOpenPDF: (url: string, title: string) => void }) => {
  const { addBookmark, removeBookmark, isBookmarked, addToRecent } = useBigBookStore();
  const bookmarked = isBookmarked(section.id);

  const handlePress = () => {
    addToRecent(section.id, section.title, section.url);
    onOpenPDF(section.url, section.title);
  };

  const toggleBookmark = () => {
    if (bookmarked) {
      removeBookmark(section.id);
    } else {
      addBookmark(section.id, section.title, section.url);
    }
  };

  return (
    <View style={styles.sectionItem}>
      <TouchableOpacity style={styles.sectionContent} onPress={handlePress} testID={`section-${section.id}`}>
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.description && <Text style={styles.sectionDescription}>{section.description}</Text>}
        </View>
        <ExternalLink size={16} color={Colors.light.muted} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark} testID={`bookmark-${section.id}`}>
        {bookmarked ? (
          <BookmarkCheck size={20} color={Colors.light.accent} />
        ) : (
          <Bookmark size={20} color={Colors.light.muted} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const CategorySection = ({ category, onOpenPDF }: { category: TwelveAndTwelveCategory; onOpenPDF: (url: string, title: string) => void }) => {
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
            <SectionItem key={section.id} section={section} categoryId={category.id} onOpenPDF={onOpenPDF} />
          ))}
        </View>
      )}
    </View>
  );
};

const BookmarksSection = ({ onOpenPDF }: { onOpenPDF: (url: string, title: string) => void }) => {
  const { bookmarks, removeBookmark, addToRecent } = useBigBookStore();

  const handleBookmarkPress = (bookmark: any) => {
    addToRecent(bookmark.sectionId, bookmark.title, bookmark.url);
    onOpenPDF(bookmark.url, bookmark.title);
  };

  if (bookmarks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Bookmark size={48} color={Colors.light.muted} />
        <Text style={styles.emptyStateText}>No bookmarks yet</Text>
        <Text style={styles.emptyStateSubtext}>Bookmark sections to access them quickly</Text>
      </View>
    );
  }

  return (
    <View style={styles.bookmarksContainer}>
      {bookmarks.map((bookmark) => (
        <View key={bookmark.sectionId} style={styles.bookmarkItem}>
          <TouchableOpacity
            style={styles.bookmarkContent}
            onPress={() => handleBookmarkPress(bookmark)}
            testID={`bookmark-item-${bookmark.sectionId}`}
          >
            <Text style={styles.bookmarkTitle}>{bookmark.title}</Text>
            <Text style={styles.bookmarkDate}>
              Added {new Date(bookmark.dateAdded).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.removeBookmarkButton}
            onPress={() => removeBookmark(bookmark.sectionId)}
            testID={`remove-bookmark-${bookmark.sectionId}`}
          >
            <Trash2 size={16} color={Colors.light.muted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const RecentSection = ({ onOpenPDF }: { onOpenPDF: (url: string, title: string) => void }) => {
  const { recentlyViewed, clearRecent, addToRecent } = useBigBookStore();

  const handleRecentPress = (recent: any) => {
    addToRecent(recent.sectionId, recent.title, recent.url);
    onOpenPDF(recent.url, recent.title);
  };

  if (recentlyViewed.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Clock size={48} color={Colors.light.muted} />
        <Text style={styles.emptyStateText}>No recent items</Text>
        <Text style={styles.emptyStateSubtext}>Recently viewed sections will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.recentContainer}>
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recently Viewed</Text>
        <TouchableOpacity onPress={clearRecent} testID="clear-recent">
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      {recentlyViewed.map((recent) => (
        <TouchableOpacity
          key={recent.sectionId}
          style={styles.recentItem}
          onPress={() => handleRecentPress(recent)}
          testID={`recent-item-${recent.sectionId}`}
        >
          <Text style={styles.recentItemTitle}>{recent.title}</Text>
          <Text style={styles.recentItemDate}>
            {new Date(recent.dateAdded).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

function TwelveAndTwelveBrowserContent() {
  const [activeTab, setActiveTab] = useState<"browse" | "bookmarks" | "recent">("browse");
  const [pdfViewerVisible, setPdfViewerVisible] = useState<boolean>(false);
  const [currentPdf, setCurrentPdf] = useState<{ url: string; title: string } | null>(null);

  const handleOpenPDF = (url: string, title: string) => {
    console.log('TwelveAndTwelve handleOpenPDF called with:', { url, title });
    setCurrentPdf({ url, title });
    setPdfViewerVisible(true);
    console.log('TwelveAndTwelve PDF viewer should now be visible:', true);
  };

  const handleClosePDF = () => {
    setPdfViewerVisible(false);
    setCurrentPdf(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(74, 144, 226, 0.3)', 'rgba(92, 184, 92, 0.1)']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 1]}
      />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "browse" && styles.activeTab]}
          onPress={() => setActiveTab("browse")}
          testID="browse-tab"
        >
          <Text style={[styles.tabText, activeTab === "browse" && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "bookmarks" && styles.activeTab]}
          onPress={() => setActiveTab("bookmarks")}
          testID="bookmarks-tab"
        >
          <Text style={[styles.tabText, activeTab === "bookmarks" && styles.activeTabText]}>Bookmarks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "recent" && styles.activeTab]}
          onPress={() => setActiveTab("recent")}
          testID="recent-tab"
        >
          <Text style={[styles.tabText, activeTab === "recent" && styles.activeTabText]}>Recent</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "browse" && (
          <View>
            <BookSelector activeBook="twelve" />
            <View style={styles.header}>
              <Text style={styles.title}>Twelve Steps and Twelve Traditions</Text>
              <Text style={styles.subtitle}>A detailed exploration of the AA program</Text>
              <Text style={styles.description}>
                Tap any section to open the official PDF from AA World Services.
              </Text>
            </View>
            
            {twelveAndTwelveData.map((category) => (
              <CategorySection key={category.id} category={category} onOpenPDF={handleOpenPDF} />
            ))}
            
            <View style={styles.copyrightContainer}>
              <Text style={styles.copyrightText}>
                Copyright © 1990 by Alcoholics Anonymous World Services, Inc. All rights reserved.
              </Text>
            </View>
          </View>
        )}
        
        {activeTab === "bookmarks" && <BookmarksSection onOpenPDF={handleOpenPDF} />}
        {activeTab === "recent" && <RecentSection onOpenPDF={handleOpenPDF} />}
      </ScrollView>
      
      <Modal
        visible={pdfViewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClosePDF}
      >
        {currentPdf && (
          <PDFViewer
            url={currentPdf.url}
            title={currentPdf.title}
            onClose={handleClosePDF}
          />
        )}
      </Modal>
    </View>
  );
}

export default function TwelveAndTwelveBrowser() {
  return (
    <BigBookStoreProvider>
      <TwelveAndTwelveBrowserContent />
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.muted,
    fontWeight: adjustFontWeight("500"),
  },
  activeTabText: {
    color: Colors.light.tint,
    fontWeight: adjustFontWeight("600"),
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 20,
    textAlign: "center",
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  sectionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  sectionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.light.muted,
    lineHeight: 16,
  },
  bookmarkButton: {
    padding: 8,
    marginLeft: 8,
  },
  bookmarksContainer: {
    padding: 16,
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  bookmarkDate: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  removeBookmarkButton: {
    padding: 8,
  },
  recentContainer: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.text,
  },
  clearText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: adjustFontWeight("500"),
  },
  recentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight("500"),
    color: Colors.light.text,
    marginBottom: 2,
  },
  recentItemDate: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: adjustFontWeight("600", true),
    color: Colors.light.muted,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: "center",
  },
  copyrightContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  copyrightText: {
    fontSize: 11,
    color: Colors.light.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});