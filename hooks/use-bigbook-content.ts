import { useState, useCallback, useMemo } from 'react';
import { BigBookChapter, BigBookParagraph } from '@/types/bigbook-v2';
import { bigBookContent } from '@/constants/bigbook-v2/content';
import { bigBookChapterMetadata, getChapterMeta } from '@/constants/bigbook-v2/metadata';

/**
 * Hook for managing Big Book content loading and navigation
 * 
 * Provides access to chapters, paragraphs, and navigation between them.
 */

export interface UseBigBookContentReturn {
  // Current state
  currentChapter: BigBookChapter | null;
  currentChapterId: string | null;
  
  // Navigation
  loadChapter: (chapterId: string) => void;
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  goToPage: (pageNumber: number) => { chapterId: string; paragraphId: string } | null;
  
  // Content access
  getChapter: (chapterId: string) => BigBookChapter | undefined;
  getAllChapters: () => typeof bigBookChapterMetadata;
  getParagraph: (paragraphId: string) => BigBookParagraph | undefined;
  
  // Search
  searchContent: (query: string) => SearchResult[];
  
  // State
  isLoading: boolean;
  error: Error | null;
}

export interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  paragraphId: string;
  paragraph: BigBookParagraph;
  matches: SearchMatch[];
  relevanceScore: number;
}

export interface SearchMatch {
  startOffset: number;
  endOffset: number;
  context: {
    before: string;
    match: string;
    after: string;
  };
}

/**
 * Extract search matches with context
 */
function extractMatches(text: string, query: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let index = 0;
  while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
    const contextLength = 40;
    const before = text.slice(Math.max(0, index - contextLength), index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length, index + query.length + contextLength);
    
    matches.push({
      startOffset: index,
      endOffset: index + query.length,
      context: {
        before: before.length < contextLength ? before : '...' + before.slice(-contextLength + 3),
        match,
        after: after.length < contextLength ? after : after.slice(0, contextLength - 3) + '...',
      },
    });
    
    index += query.length;
  }
  
  return matches;
}

export function useBigBookContent(): UseBigBookContentReturn {
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);
  
  /**
   * Get current chapter from content
   */
  const currentChapter = useMemo(() => {
    if (!currentChapterId) return null;
    return bigBookContent[currentChapterId] || null;
  }, [currentChapterId]);
  
  /**
   * Load a specific chapter
   */
  const loadChapter = useCallback((chapterId: string) => {
    if (bigBookContent[chapterId]) {
      setCurrentChapterId(chapterId);
    } else {
      console.error('[useBigBookContent] Chapter not found:', chapterId);
    }
  }, []);
  
  /**
   * Navigate to next chapter
   */
  const goToNextChapter = useCallback(() => {
    if (!currentChapterId) return;
    
    const currentIndex = bigBookChapterMetadata.findIndex(meta => meta.id === currentChapterId);
    if (currentIndex >= 0 && currentIndex < bigBookChapterMetadata.length - 1) {
      const nextChapter = bigBookChapterMetadata[currentIndex + 1];
      loadChapter(nextChapter.id);
    }
  }, [currentChapterId, loadChapter]);
  
  /**
   * Navigate to previous chapter
   */
  const goToPreviousChapter = useCallback(() => {
    if (!currentChapterId) return;
    
    const currentIndex = bigBookChapterMetadata.findIndex(meta => meta.id === currentChapterId);
    if (currentIndex > 0) {
      const prevChapter = bigBookChapterMetadata[currentIndex - 1];
      loadChapter(prevChapter.id);
    }
  }, [currentChapterId, loadChapter]);
  
  /**
   * Navigate to a specific page number
   * Returns the chapter and paragraph that contains that page
   */
  const goToPage = useCallback((pageNumber: number): { chapterId: string; paragraphId: string } | null => {
    // Find chapter that contains this page
    const chapterMeta = bigBookChapterMetadata.find(
      meta => pageNumber >= meta.pageRange[0] && pageNumber <= meta.pageRange[1]
    );
    
    if (!chapterMeta) {
      console.error('[useBigBookContent] Page not found:', pageNumber);
      return null;
    }
    
    // Load the chapter
    const chapter = bigBookContent[chapterMeta.id];
    if (!chapter) {
      console.error('[useBigBookContent] Chapter content not found:', chapterMeta.id);
      return null;
    }
    
    // Find first paragraph on this page
    const paragraph = chapter.paragraphs.find(p => p.pageNumber === pageNumber);
    
    if (!paragraph) {
      console.error('[useBigBookContent] No paragraph found on page:', pageNumber);
      return null;
    }
    
    // Load the chapter
    loadChapter(chapterMeta.id);
    
    return {
      chapterId: chapterMeta.id,
      paragraphId: paragraph.id,
    };
  }, [loadChapter]);
  
  /**
   * Get a specific chapter
   */
  const getChapter = useCallback((chapterId: string): BigBookChapter | undefined => {
    return bigBookContent[chapterId];
  }, []);
  
  /**
   * Get all chapter metadata
   */
  const getAllChapters = useCallback(() => {
    return bigBookChapterMetadata;
  }, []);
  
  /**
   * Get a specific paragraph by ID
   */
  const getParagraph = useCallback((paragraphId: string): BigBookParagraph | undefined => {
    // Extract chapter ID from paragraph ID (e.g., "chapter-1-p5" -> "chapter-1")
    const chapterId = paragraphId.substring(0, paragraphId.lastIndexOf('-p'));
    const chapter = bigBookContent[chapterId];
    
    if (!chapter) return undefined;
    
    return chapter.paragraphs.find(p => p.id === paragraphId);
  }, []);
  
  /**
   * Search across all content
   */
  const searchContent = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Search through all chapters
    Object.values(bigBookContent).forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        const lowerContent = paragraph.content.toLowerCase();
        
        // Check if paragraph contains the search query
        if (lowerContent.includes(lowerQuery)) {
          const matches = extractMatches(paragraph.content, query);
          
          // Calculate relevance score (number of matches + position bonus)
          const relevanceScore = matches.length * 10 + (paragraph.order === 1 ? 5 : 0);
          
          results.push({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            paragraphId: paragraph.id,
            paragraph,
            matches,
            relevanceScore,
          });
        }
      });
    });
    
    // Sort by relevance (highest first)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  }, []);
  
  return {
    currentChapter,
    currentChapterId,
    loadChapter,
    goToNextChapter,
    goToPreviousChapter,
    goToPage,
    getChapter,
    getAllChapters,
    getParagraph,
    searchContent,
    isLoading,
    error,
  };
}

/**
 * Hook for getting chapter navigation info
 */
export function useChapterNavigation(currentChapterId: string | null) {
  return useMemo(() => {
    if (!currentChapterId) {
      return {
        canGoNext: false,
        canGoPrevious: false,
        nextChapter: null,
        previousChapter: null,
      };
    }
    
    const currentIndex = bigBookChapterMetadata.findIndex(meta => meta.id === currentChapterId);
    
    return {
      canGoNext: currentIndex >= 0 && currentIndex < bigBookChapterMetadata.length - 1,
      canGoPrevious: currentIndex > 0,
      nextChapter: currentIndex >= 0 && currentIndex < bigBookChapterMetadata.length - 1
        ? bigBookChapterMetadata[currentIndex + 1]
        : null,
      previousChapter: currentIndex > 0
        ? bigBookChapterMetadata[currentIndex - 1]
        : null,
    };
  }, [currentChapterId]);
}

