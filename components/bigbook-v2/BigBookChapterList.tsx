/**
 * Big Book Chapter List Component
 * 
 * Displays organized list of all Big Book chapters for navigation.
 * Groups chapters into sections: Front Matter, Main Chapters, Appendices.
 * 
 * Phase 6 Refactor: Now includes BOOK-LEVEL navigation features:
 * - Highlights list (all chapters)
 * - Bookmarks list (all chapters)
 * - Go to Page navigation
 * - Search (for finding chapters)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft,
  ChevronRight,
  Hash,
  Bookmark as BookmarkIcon,
  Highlighter,
  Search as SearchIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { useTextSettings } from '@/hooks/use-text-settings';
import { BigBookChapterMeta } from '@/types/bigbook-v2';
import { getMainChapters, getFrontMatter, getAppendices } from '@/constants/bigbook-v2/metadata';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { useBigBookHighlights } from '@/hooks/use-bigbook-highlights';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { getBigBookStorage } from '@/lib/bigbook-storage';
import { BigBookHighlightsList } from './BigBookHighlightsList';
import { BigBookBookmarksList } from './BigBookBookmarksList';
import { BigBookPageNavigation } from './BigBookPageNavigation';
import { BigBookSearchModal } from './BigBookSearchModal';

interface BigBookChapterListProps {
  onSelectChapter: (chapterId: string, scrollToParagraphId?: string, searchTerm?: string) => void;
  onBack?: () => void;
  isReaderOpen?: boolean;
}

interface SectionProps {
  title: string;
  chapters: BigBookChapterMeta[];
  onSelectChapter: (chapterId: string) => void;
  fontSize: number;
}

// Helper to remove chapter numbers from titles (e.g., "1. Bill's Story" -> "Bill's Story")
function removeChapterNumber(title: string): string {
  return title.replace(/^\d+\.\s*/, '');
}

function ChapterSection({ title, chapters, onSelectChapter, fontSize }: SectionProps) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionLabel}>{title}</Text>
      
      <View style={styles.listContainer}>
        {chapters.map((chapter, index) => (
          <TouchableOpacity
            key={chapter.id}
            style={[
              styles.listRow,
              index === chapters.length - 1 && styles.listRowLast
            ]}
            onPress={() => onSelectChapter(chapter.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowTitle, { fontSize }]}>{removeChapterNumber(chapter.title)}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.pageNumber}>
                pp. {formatPageNumber(chapter.pageRange[0], chapter.useRomanNumerals || false)}-{formatPageNumber(chapter.pageRange[1], chapter.useRomanNumerals || false)}
              </Text>
              <ChevronRight size={18} color="#a0a0a0" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function BigBookChapterList({ onSelectChapter, onBack, isReaderOpen }: BigBookChapterListProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontSize } = useTextSettings();
  const frontMatter = getFrontMatter();
  const mainChapters = getMainChapters();
  const appendices = getAppendices();
  
  // Get highlights from context
  const { highlights } = useBigBookHighlights();
  const hasHighlights = highlights.length > 0;
  
  // State for modals
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [showBookmarksList, setShowBookmarksList] = useState(false);
  
  // Load bookmarks count directly from storage (since there's no provider)
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const refreshBookmarksCount = async () => {
    const storage = getBigBookStorage();
    const allBookmarks = await storage.getAllBookmarks();
    console.log('[BigBookChapterList] Loaded bookmarks count:', allBookmarks.length);
    setBookmarksCount(allBookmarks.length);
  };
  useEffect(() => {
    refreshBookmarksCount();
  }, [showBookmarksList, isReaderOpen]); // Refresh when bookmarks modal closes OR reader closes
  const hasBookmarks = bookmarksCount > 0;
  console.log('[BigBookChapterList] hasBookmarks:', hasBookmarks, 'count:', bookmarksCount);
  const [showPageNavigation, setShowPageNavigation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Get content helper for page navigation
  const { goToPage } = useBigBookContent();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/literature');
    }
  };
  
  // Handle navigation from highlights list
  const handleNavigateToHighlight = (chapterId: string, paragraphId: string) => {
    console.log('[BigBookChapterList] Navigating to highlight:', { chapterId, paragraphId });
    onSelectChapter(chapterId, paragraphId);
  };
  
  // Handle navigation from bookmarks list (page-based)
  const handleNavigateToBookmark = (chapterId: string, pageNumber: number) => {
    console.log('[BigBookChapterList] Navigating to bookmark page:', { chapterId, pageNumber });
    // Use goToPage to find first paragraph on that page
    const result = goToPage(pageNumber);
    if (result) {
      onSelectChapter(result.chapterId, result.paragraphId);
    }
  };
  
  // Handle page navigation
  const handleNavigateToPage = (pageNumber: number) => {
    console.log('[BigBookChapterList] Navigating to page:', pageNumber);
    const result = goToPage(pageNumber);
    console.log('[BigBookChapterList] goToPage result:', result);
    
    if (result) {
      onSelectChapter(result.chapterId, result.paragraphId);
    } else {
      console.log('[BigBookChapterList] Page not found:', pageNumber);
    }
    
    return result;
  };
  
  // Handle search result selection
  const handleSearchResultSelect = (chapterId: string, paragraphId: string, searchTerm: string) => {
    console.log('[BigBookChapterList] Navigating to search result:', { chapterId, paragraphId, searchTerm });
    onSelectChapter(chapterId, paragraphId, searchTerm);
  };

  return (
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
            onPress={handleBack}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Alcoholics Anonymous</Text>
      </LinearGradient>
      
      {/* Action Row - Below header */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => setShowPageNavigation(true)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <Hash size={18} color="#3D8B8B" />
          <Text style={styles.actionButtonText}>Page</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowSearch(true)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <SearchIcon size={18} color="#3D8B8B" />
          <Text style={styles.actionButtonText}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowHighlightsList(true)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <Highlighter size={18} color="#3D8B8B" fill={hasHighlights ? "#3D8B8B" : "transparent"} />
          <Text style={styles.actionButtonText}>Highlights</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowBookmarksList(true)}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <BookmarkIcon size={18} color="#3D8B8B" fill={hasBookmarks ? "#3D8B8B" : "transparent"} />
          <Text style={styles.actionButtonText}>Bookmarks</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <ChapterSection
          title="Forewords and Preface"
          chapters={frontMatter}
          onSelectChapter={onSelectChapter}
          fontSize={fontSize}
        />
        
        <ChapterSection
          title="Main Chapters"
          chapters={mainChapters}
          onSelectChapter={onSelectChapter}
          fontSize={fontSize}
        />
        
        <ChapterSection
          title="Appendices"
          chapters={appendices}
          onSelectChapter={onSelectChapter}
          fontSize={fontSize}
        />
      </ScrollView>
      
      {/* Book-Level Navigation Modals */}
      <BigBookHighlightsList
        visible={showHighlightsList}
        onClose={() => setShowHighlightsList(false)}
        onNavigateToHighlight={handleNavigateToHighlight}
      />
      
      <BigBookBookmarksList
        visible={showBookmarksList}
        onClose={() => setShowBookmarksList(false)}
        onNavigateToBookmark={handleNavigateToBookmark}
        onBookmarksChanged={refreshBookmarksCount}
      />
      
      <BigBookPageNavigation
        visible={showPageNavigation}
        onClose={() => setShowPageNavigation(false)}
        onNavigateToPage={handleNavigateToPage}
      />
      
      <BigBookSearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigateToResult={handleSearchResultSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: adjustFontWeight('400'),
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#3D8B8B',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: adjustFontWeight('600'),
    color: '#6b7c8a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  listContainer: {
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('500'),
    color: '#000',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNumber: {
    fontSize: 13,
    color: '#a0a0a0',
  },
});
