import { useState, useEffect, useCallback } from 'react';
import { BigBookBookmark } from '@/types/bigbook-v2';
import { getBigBookStorage } from '@/lib/bigbook-storage';

/**
 * Hook for managing Big Book bookmarks (page-level)
 * 
 * Provides CRUD operations for page-based bookmarks with automatic persistence
 * and real-time updates across components.
 */

export interface UseBigBookBookmarksReturn {
  // State
  bookmarks: BigBookBookmark[];
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  addBookmark: (
    pageNumber: number,
    chapterId: string,
    label?: string
  ) => Promise<BigBookBookmark>;
  
  deleteBookmark: (id: string) => Promise<void>;
  
  updateBookmarkLabel: (id: string, label: string) => Promise<void>;
  
  getBookmarksByChapter: (chapterId: string) => BigBookBookmark[];
  
  isPageBookmarked: (pageNumber: number) => boolean;
  
  getBookmarkForPage: (pageNumber: number) => BigBookBookmark | undefined;
  
  clearAllBookmarks: () => Promise<void>;
  
  refresh: () => Promise<void>;
}

/**
 * Generate a unique ID for bookmarks
 */
function generateBookmarkId(): string {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useBigBookBookmarks(chapterId?: string): UseBigBookBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<BigBookBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const storage = getBigBookStorage();
  
  /**
   * Load bookmarks from storage
   */
  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loaded = chapterId 
        ? await storage.getBookmarks(chapterId)
        : await storage.getAllBookmarks();
      
      // Sort by page number (ascending)
      loaded.sort((a, b) => a.pageNumber - b.pageNumber);
      
      setBookmarks(loaded);
    } catch (err) {
      console.error('[useBigBookBookmarks] Error loading bookmarks:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, storage]);
  
  /**
   * Load on mount and when chapterId changes
   */
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);
  
  /**
   * Add a new bookmark for a page
   */
  const addBookmark = useCallback(async (
    pageNumber: number,
    chapterId: string,
    label?: string
  ): Promise<BigBookBookmark> => {
    try {
      // Check if page is already bookmarked
      const existing = bookmarks.find(b => b.pageNumber === pageNumber);
      if (existing) {
        console.log('[useBigBookBookmarks] Page already bookmarked:', pageNumber);
        return existing;
      }
      
      const newBookmark: BigBookBookmark = {
        id: generateBookmarkId(),
        pageNumber,
        chapterId,
        label,
        createdAt: Date.now(),
      };
      
      await storage.saveBookmark(newBookmark);
      
      // Update local state (insert in sorted position)
      setBookmarks(prev => {
        const updated = [...prev, newBookmark];
        updated.sort((a, b) => a.pageNumber - b.pageNumber);
        return updated;
      });
      
      return newBookmark;
    } catch (err) {
      console.error('[useBigBookBookmarks] Error adding bookmark:', err);
      throw err;
    }
  }, [bookmarks, storage]);
  
  /**
   * Delete a bookmark
   */
  const deleteBookmark = useCallback(async (id: string): Promise<void> => {
    try {
      await storage.deleteBookmark(id);
      
      // Update local state
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('[useBigBookBookmarks] Error deleting bookmark:', err);
      throw err;
    }
  }, [storage]);
  
  /**
   * Update a bookmark's label
   */
  const updateBookmarkLabel = useCallback(async (id: string, label: string): Promise<void> => {
    try {
      const bookmark = bookmarks.find(b => b.id === id);
      if (!bookmark) {
        throw new Error(`Bookmark ${id} not found`);
      }
      
      const updated = { ...bookmark, label };
      await storage.saveBookmark(updated);
      
      // Update local state
      setBookmarks(prev => prev.map(b => 
        b.id === id ? updated : b
      ));
    } catch (err) {
      console.error('[useBigBookBookmarks] Error updating bookmark label:', err);
      throw err;
    }
  }, [bookmarks, storage]);
  
  /**
   * Get bookmarks for a specific chapter
   */
  const getBookmarksByChapter = useCallback((chapterId: string): BigBookBookmark[] => {
    return bookmarks.filter(b => b.chapterId === chapterId);
  }, [bookmarks]);
  
  /**
   * Check if a page is bookmarked
   */
  const isPageBookmarked = useCallback((pageNumber: number): boolean => {
    return bookmarks.some(b => b.pageNumber === pageNumber);
  }, [bookmarks]);
  
  /**
   * Get bookmark for a specific page
   */
  const getBookmarkForPage = useCallback((pageNumber: number): BigBookBookmark | undefined => {
    // Page numbers may repeat across chapters; prefer a bookmark that matches
    // the current chapter if chapterId was provided
    if (chapterId) {
      const inChapter = bookmarks.find(b => b.pageNumber === pageNumber && b.chapterId === chapterId);
      if (inChapter) return inChapter;
    }
    return bookmarks.find(b => b.pageNumber === pageNumber);
  }, [bookmarks, chapterId]);
  
  /**
   * Clear all bookmarks
   */
  const clearAllBookmarks = useCallback(async (): Promise<void> => {
    try {
      await storage.clearAllBookmarks();
      setBookmarks([]);
    } catch (err) {
      console.error('[useBigBookBookmarks] Error clearing bookmarks:', err);
      throw err;
    }
  }, [storage]);
  
  /**
   * Manually refresh bookmarks from storage
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadBookmarks();
  }, [loadBookmarks]);
  
  return {
    bookmarks,
    isLoading,
    error,
    addBookmark,
    deleteBookmark,
    updateBookmarkLabel,
    getBookmarksByChapter,
    isPageBookmarked,
    getBookmarkForPage,
    clearAllBookmarks,
    refresh,
  };
}

/**
 * Hook for checking if a specific page is bookmarked
 * Optimized for checking current page bookmark status
 */
export function usePageBookmark(pageNumber: number): {
  isBookmarked: boolean;
  bookmark: BigBookBookmark | undefined;
  isLoading: boolean;
} {
  const { bookmarks, isLoading, isPageBookmarked, getBookmarkForPage } = useBigBookBookmarks();
  
  return {
    isBookmarked: isPageBookmarked(pageNumber),
    bookmark: getBookmarkForPage(pageNumber),
    isLoading,
  };
}
