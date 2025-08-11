import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BigBookmark } from "@/types/bigbook";

export const [BigBookStoreProvider, useBigBookStore] = createContextHook(() => {
  const [bookmarks, setBookmarks] = useState<BigBookmark[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<BigBookmark[]>([]);

  // Load bookmarks and recent items from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedBookmarks, storedRecent] = await Promise.all([
          AsyncStorage.getItem("aa-bigbook-bookmarks"),
          AsyncStorage.getItem("aa-bigbook-recent")
        ]);
        
        if (storedBookmarks) {
          setBookmarks(JSON.parse(storedBookmarks));
        }
        
        if (storedRecent) {
          setRecentlyViewed(JSON.parse(storedRecent));
        }
      } catch (error) {
        console.error("Error loading Big Book data:", error);
      }
    };
    
    loadData();
  }, []);

  // Save bookmarks when they change
  useEffect(() => {
    const saveBookmarks = async () => {
      try {
        await AsyncStorage.setItem("aa-bigbook-bookmarks", JSON.stringify(bookmarks));
      } catch (error) {
        console.error("Error saving bookmarks:", error);
      }
    };
    
    if (bookmarks.length >= 0) {
      saveBookmarks();
    }
  }, [bookmarks]);

  // Save recent items when they change
  useEffect(() => {
    const saveRecent = async () => {
      try {
        await AsyncStorage.setItem("aa-bigbook-recent", JSON.stringify(recentlyViewed));
      } catch (error) {
        console.error("Error saving recent items:", error);
      }
    };
    
    if (recentlyViewed.length >= 0) {
      saveRecent();
    }
  }, [recentlyViewed]);

  const addBookmark = (sectionId: string, title: string, url: string) => {
    const newBookmark: BigBookmark = {
      sectionId,
      title,
      url,
      dateAdded: Date.now(),
    };
    
    setBookmarks(prev => {
      // Remove if already exists, then add to beginning
      const filtered = prev.filter(b => b.sectionId !== sectionId);
      return [newBookmark, ...filtered];
    });
  };

  const removeBookmark = (sectionId: string) => {
    setBookmarks(prev => prev.filter(b => b.sectionId !== sectionId));
  };

  const isBookmarked = (sectionId: string): boolean => {
    return bookmarks.some(b => b.sectionId === sectionId);
  };

  const addToRecent = (sectionId: string, title: string, url: string) => {
    const recentItem: BigBookmark = {
      sectionId,
      title,
      url,
      dateAdded: Date.now(),
    };
    
    setRecentlyViewed(prev => {
      // Remove if already exists, then add to beginning, limit to 10 items
      const filtered = prev.filter(r => r.sectionId !== sectionId);
      return [recentItem, ...filtered].slice(0, 10);
    });
  };

  const clearRecent = async () => {
    try {
      await AsyncStorage.removeItem("aa-bigbook-recent");
      setRecentlyViewed([]);
    } catch (error) {
      console.error("Error clearing recent items:", error);
    }
  };

  return {
    bookmarks,
    recentlyViewed,
    addBookmark,
    removeBookmark,
    isBookmarked,
    addToRecent,
    clearRecent,
  };
});