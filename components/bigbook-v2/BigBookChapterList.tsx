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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText,
  Hash,
  Bookmark as BookmarkIcon,
  Highlighter,
  Search as SearchIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { adjustFontWeight } from '@/constants/fonts';
import { BigBookChapterMeta } from '@/types/bigbook-v2';
import { getMainChapters, getFrontMatter, getAppendices } from '@/constants/bigbook-v2/metadata';
import { useBigBookContent } from '@/hooks/use-bigbook-content';
import { formatPageNumber } from '@/lib/bigbook-page-utils';
import { BigBookHighlightsList } from './BigBookHighlightsList';
import { BigBookBookmarksList } from './BigBookBookmarksList';
import { BigBookPageNavigation } from './BigBookPageNavigation';
import { BigBookSearchModal } from './BigBookSearchModal';

interface BigBookChapterListProps {
  onSelectChapter: (chapterId: string, scrollToParagraphId?: string, searchTerm?: string) => void;
}

interface SectionProps {
  title: string;
  description: string;
  chapters: BigBookChapterMeta[];
  onSelectChapter: (chapterId: string) => void;
  defaultExpanded?: boolean;
}

function ChapterSection({ title, description, chapters, onSelectChapter, defaultExpanded = false }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
        {expanded ? (
          <ChevronDown size={20} color={Colors.light.muted} />
        ) : (
          <ChevronRight size={20} color={Colors.light.muted} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.chaptersContainer}>
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              style={styles.chapterItem}
              onPress={() => onSelectChapter(chapter.id)}
              activeOpacity={0.7}
            >
              <View style={styles.chapterInfo}>
                <View style={styles.chapterTitleRow}>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Text style={styles.chapterPages}>
                    pp. {formatPageNumber(chapter.pageRange[0], chapter.useRomanNumerals || false)}-{formatPageNumber(chapter.pageRange[1], chapter.useRomanNumerals || false)}
                  </Text>
                </View>
                {chapter.description && (
                  <Text style={styles.chapterDescription}>{chapter.description}</Text>
                )}
              </View>
              <FileText size={20} color={Colors.light.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function BigBookChapterList({ onSelectChapter }: BigBookChapterListProps) {
  const frontMatter = getFrontMatter();
  const mainChapters = getMainChapters();
  const appendices = getAppendices();
  
  // State for modals
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [showBookmarksList, setShowBookmarksList] = useState(false);
  const [showPageNavigation, setShowPageNavigation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Get content helper for page navigation
  const { goToPage } = useBigBookContent();
  
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
      console.error('[BigBookChapterList] goToPage returned null');
    }
  };
  
  // Handle search result selection
  const handleSearchResultSelect = (chapterId: string, paragraphId: string, searchTerm: string) => {
    console.log('[BigBookChapterList] Navigating to search result:', { chapterId, paragraphId, searchTerm });
    onSelectChapter(chapterId, paragraphId, searchTerm);
  };

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
        {/* Action Row - Above Title */}
        <View style={styles.actionRow}>
          {/* Go to Page */}
          <TouchableOpacity
            onPress={() => setShowPageNavigation(true)}
            activeOpacity={0.6}
            style={styles.actionButton}
          >
            <Hash size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Go to Page</Text>
          </TouchableOpacity>
          
          {/* Search */}
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            activeOpacity={0.6}
            style={styles.actionButton}
          >
            <SearchIcon size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Search</Text>
          </TouchableOpacity>
          
          {/* Highlights */}
          <TouchableOpacity
            onPress={() => setShowHighlightsList(true)}
            activeOpacity={0.6}
            style={styles.actionButton}
          >
            <Highlighter size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Highlights</Text>
          </TouchableOpacity>
          
          {/* Bookmarks */}
          <TouchableOpacity
            onPress={() => setShowBookmarksList(true)}
            activeOpacity={0.6}
            style={styles.actionButton}
          >
            <BookmarkIcon size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Bookmarks</Text>
          </TouchableOpacity>
        </View>
        
        {/* Header - Title Only */}
        <View style={styles.header}>
          {/* Title */}
          {Platform.OS !== 'android' && (
            <Text style={styles.title}>Alcoholics Anonymous</Text>
          )}
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <ChapterSection
            title="Forewords and Preface"
            description="Includes The Doctor's Opinion"
            chapters={frontMatter}
            onSelectChapter={onSelectChapter}
          />
          
          <ChapterSection
            title="Main Chapters"
            description="The first 164 pages - the basic text of AA"
            chapters={mainChapters}
            onSelectChapter={onSelectChapter}
            defaultExpanded={true}
          />
          
          <ChapterSection
            title="Appendices"
            description="Additional resources and information"
            chapters={appendices}
            onSelectChapter={onSelectChapter}
          />
        </ScrollView>
      </View>
      
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
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingTop: 4,
    paddingBottom: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  header: {
    paddingVertical: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: adjustFontWeight('bold', true),
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
  },
  sectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  chaptersContainer: {
    marginTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  chapterInfo: {
    flex: 1,
    marginRight: 12,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: adjustFontWeight('600'),
    color: Colors.light.text,
    flex: 1,
  },
  chapterDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  chapterPages: {
    fontSize: 13,
    color: Colors.light.muted,
    marginLeft: 8,
  },
});
