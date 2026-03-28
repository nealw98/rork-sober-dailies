import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const [BigBookStoreProvider, useBigBookStore] = createContextHook(() => {
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  // Load recent items from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedRecent = await AsyncStorage.getItem("aa-bigbook-recent");
        
        if (storedRecent) {
          setRecentlyViewed(JSON.parse(storedRecent));
        }
      } catch (error) {
        console.error("Error loading Big Book data:", error);
      }
    };
    
    loadData();
  }, []);


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


  const addToRecent = (sectionId: string, title: string, url: string) => {
    const recentItem = {
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
    recentlyViewed,
    addToRecent,
    clearRecent,
  };
});