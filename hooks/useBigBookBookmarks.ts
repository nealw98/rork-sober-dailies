import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BigBookBookmark {
  id: string;
  pageNumber: number;
  chapterTitle: string;
  chapterId: string;
  timestamp: string;
}

const STORAGE_KEY = 'BIG_BOOK_BOOKMARKS';

export const useBigBookBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<BigBookBookmark[]>([]);

  const loadBookmarks = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sort by page number
        const sorted = parsed.sort((a: BigBookBookmark, b: BigBookBookmark) => a.pageNumber - b.pageNumber);
        setBookmarks(sorted);
      }
    } catch (error) {
      console.error('[Bookmarks] Error loading:', error);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const addBookmark = useCallback(async (pageNumber: number, chapterTitle: string, chapterId: string) => {
    try {
      // Check if bookmark already exists for this page
      const existingIndex = bookmarks.findIndex(b => b.pageNumber === pageNumber);
      
      if (existingIndex >= 0) {
        // Already bookmarked - do nothing (user will remove it instead)
        return false;
      }

      const newBookmark: BigBookBookmark = {
        id: `bookmark-${Date.now()}`,
        pageNumber,
        chapterTitle,
        chapterId,
        timestamp: new Date().toISOString(),
      };

      const updatedBookmarks = [...bookmarks, newBookmark].sort((a, b) => a.pageNumber - b.pageNumber);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
      setBookmarks(updatedBookmarks);
      console.log('[Bookmarks] Added:', newBookmark);
      return true;
    } catch (error) {
      console.error('[Bookmarks] Error adding:', error);
      return false;
    }
  }, [bookmarks]);

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    try {
      const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
      setBookmarks(updatedBookmarks);
      console.log('[Bookmarks] Removed:', bookmarkId);
    } catch (error) {
      console.error('[Bookmarks] Error removing:', error);
    }
  }, [bookmarks]);

  const isPageBookmarked = useCallback((pageNumber: number) => {
    return bookmarks.some(b => b.pageNumber === pageNumber);
  }, [bookmarks]);

  const toggleBookmark = useCallback(async (pageNumber: number, chapterTitle: string, chapterId: string) => {
    const existing = bookmarks.find(b => b.pageNumber === pageNumber);
    if (existing) {
      await removeBookmark(existing.id);
      return false; // Removed
    } else {
      await addBookmark(pageNumber, chapterTitle, chapterId);
      return true; // Added
    }
  }, [bookmarks, addBookmark, removeBookmark]);

  const clearAllBookmarks = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setBookmarks([]);
      console.log('[Bookmarks] Cleared all');
    } catch (error) {
      console.error('[Bookmarks] Error clearing:', error);
    }
  }, []);

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isPageBookmarked,
    toggleBookmark,
    clearAllBookmarks,
    hasBookmarks: bookmarks.length > 0,
    bookmarkCount: bookmarks.length,
  };
};

