import AsyncStorage from '@react-native-async-storage/async-storage';
import { BigBookHighlight, BigBookBookmark } from '@/types/bigbook-v2';

/**
 * Big Book Storage Service
 * 
 * AsyncStorage-based implementation for storing highlights and bookmarks.
 * The interface is designed to allow adding cloud sync in the future
 * without rewriting components that depend on this service.
 */

// Storage keys
const HIGHLIGHTS_KEY = '@bigbook_v2:highlights';
const BOOKMARKS_KEY = '@bigbook_v2:bookmarks';

/**
 * Storage Service Interface
 * This interface can be implemented with cloud storage in the future
 */
export interface BigBookStorageService {
  // Highlights
  saveHighlight(highlight: BigBookHighlight): Promise<void>;
  getHighlights(chapterId?: string): Promise<BigBookHighlight[]>;
  updateHighlight(id: string, updates: Partial<BigBookHighlight>): Promise<void>;
  deleteHighlight(id: string): Promise<void>;
  
  // Bookmarks
  saveBookmark(bookmark: BigBookBookmark): Promise<void>;
  getBookmarks(chapterId?: string): Promise<BigBookBookmark[]>;
  deleteBookmark(id: string): Promise<void>;
  
  // Batch operations
  getAllHighlights(): Promise<BigBookHighlight[]>;
  getAllBookmarks(): Promise<BigBookBookmark[]>;
  clearAllHighlights(): Promise<void>;
  clearAllBookmarks(): Promise<void>;
}

/**
 * AsyncStorage Implementation
 */
class AsyncStorageService implements BigBookStorageService {
  // ========== HIGHLIGHTS ==========
  
  async saveHighlight(highlight: BigBookHighlight): Promise<void> {
    try {
      const highlights = await this.getAllHighlights();
      
      // Check if highlight already exists
      const existingIndex = highlights.findIndex(h => h.id === highlight.id);
      
      if (existingIndex >= 0) {
        // Update existing
        highlights[existingIndex] = highlight;
      } else {
        // Add new
        highlights.push(highlight);
      }
      
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
      console.log('[BigBookStorage] Saved highlight:', highlight.id);
    } catch (error) {
      console.error('[BigBookStorage] Error saving highlight:', error);
      throw error;
    }
  }
  
  async getHighlights(chapterId?: string): Promise<BigBookHighlight[]> {
    try {
      const allHighlights = await this.getAllHighlights();
      
      if (chapterId) {
        return allHighlights.filter(h => h.chapterId === chapterId);
      }
      
      return allHighlights;
    } catch (error) {
      console.error('[BigBookStorage] Error getting highlights:', error);
      return [];
    }
  }
  
  async updateHighlight(id: string, updates: Partial<BigBookHighlight>): Promise<void> {
    try {
      const highlights = await this.getAllHighlights();
      const index = highlights.findIndex(h => h.id === id);
      
      if (index === -1) {
        throw new Error(`Highlight ${id} not found`);
      }
      
      // Update with timestamp
      highlights[index] = {
        ...highlights[index],
        ...updates,
        updatedAt: Date.now(),
      };
      
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
      console.log('[BigBookStorage] Updated highlight:', id);
    } catch (error) {
      console.error('[BigBookStorage] Error updating highlight:', error);
      throw error;
    }
  }
  
  async deleteHighlight(id: string): Promise<void> {
    try {
      const highlights = await this.getAllHighlights();
      const filtered = highlights.filter(h => h.id !== id);
      
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(filtered));
      console.log('[BigBookStorage] Deleted highlight:', id);
    } catch (error) {
      console.error('[BigBookStorage] Error deleting highlight:', error);
      throw error;
    }
  }
  
  async getAllHighlights(): Promise<BigBookHighlight[]> {
    try {
      const data = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[BigBookStorage] Error getting all highlights:', error);
      return [];
    }
  }
  
  async clearAllHighlights(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HIGHLIGHTS_KEY);
      console.log('[BigBookStorage] Cleared all highlights');
    } catch (error) {
      console.error('[BigBookStorage] Error clearing highlights:', error);
      throw error;
    }
  }
  
  // ========== BOOKMARKS ==========
  
  async saveBookmark(bookmark: BigBookBookmark): Promise<void> {
    try {
      const bookmarks = await this.getAllBookmarks();
      
      // Check if bookmark already exists
      const existingIndex = bookmarks.findIndex(b => b.id === bookmark.id);
      
      if (existingIndex >= 0) {
        // Update existing
        bookmarks[existingIndex] = bookmark;
      } else {
        // Add new
        bookmarks.push(bookmark);
      }
      
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      console.log('[BigBookStorage] Saved bookmark:', bookmark.id);
    } catch (error) {
      console.error('[BigBookStorage] Error saving bookmark:', error);
      throw error;
    }
  }
  
  async getBookmarks(chapterId?: string): Promise<BigBookBookmark[]> {
    try {
      const allBookmarks = await this.getAllBookmarks();
      
      if (chapterId) {
        return allBookmarks.filter(b => b.chapterId === chapterId);
      }
      
      return allBookmarks;
    } catch (error) {
      console.error('[BigBookStorage] Error getting bookmarks:', error);
      return [];
    }
  }
  
  async deleteBookmark(id: string): Promise<void> {
    try {
      const bookmarks = await this.getAllBookmarks();
      const filtered = bookmarks.filter(b => b.id !== id);
      
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
      console.log('[BigBookStorage] Deleted bookmark:', id);
    } catch (error) {
      console.error('[BigBookStorage] Error deleting bookmark:', error);
      throw error;
    }
  }
  
  async getAllBookmarks(): Promise<BigBookBookmark[]> {
    try {
      const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[BigBookStorage] Error getting all bookmarks:', error);
      return [];
    }
  }
  
  async clearAllBookmarks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BOOKMARKS_KEY);
      console.log('[BigBookStorage] Cleared all bookmarks');
    } catch (error) {
      console.error('[BigBookStorage] Error clearing bookmarks:', error);
      throw error;
    }
  }
}

// Singleton instance
let storageInstance: BigBookStorageService | null = null;

/**
 * Get the storage service instance
 * This allows swapping implementations (e.g., add cloud sync) without changing consumers
 */
export function getBigBookStorage(): BigBookStorageService {
  if (!storageInstance) {
    storageInstance = new AsyncStorageService();
  }
  return storageInstance;
}

/**
 * Set a custom storage implementation (for testing or cloud sync)
 */
export function setBigBookStorage(service: BigBookStorageService): void {
  storageInstance = service;
}

/**
 * Export default instance for convenience
 */
export const bigBookStorage = {
  get instance() {
    return getBigBookStorage();
  }
};

