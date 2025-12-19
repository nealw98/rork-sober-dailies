import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

export type ReflectionBookmark = {
  id: string; // ISO date string YYYY-MM-DD
  displayDate: string;
  title: string;
  quote: string;
  source: string;
  reflection: string;
  thought: string;
  timestamp: number;
};

const STORAGE_KEY = "daily-reflection-bookmarks-v1";

export const [DailyReflectionBookmarksProvider, useDailyReflectionBookmarks] =
  createContextHook(() => {
    const [bookmarks, setBookmarks] = useState<ReflectionBookmark[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      const load = async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed: ReflectionBookmark[] = JSON.parse(stored);
            setBookmarks(parsed);
          }
        } catch (e) {
          console.warn("[bookmarks] load failed", e);
        } finally {
          setLoaded(true);
        }
      };
      load();
    }, []);

    useEffect(() => {
      if (!loaded) return;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)).catch((e) =>
        console.warn("[bookmarks] save failed", e)
      );
    }, [bookmarks, loaded]);

    const isBookmarked = useCallback(
      (id: string) => bookmarks.some((b) => b.id === id),
      [bookmarks]
    );

    const toggleBookmark = useCallback(
      (entry: ReflectionBookmark) => {
        setBookmarks((prev) => {
          if (prev.some((b) => b.id === entry.id)) {
            return prev.filter((b) => b.id !== entry.id);
          }
          return [{ ...entry, timestamp: Date.now() }, ...prev].sort(
            (a, b) => b.timestamp - a.timestamp
          );
        });
      },
      []
    );

    const removeBookmark = useCallback((id: string) => {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }, []);

    const sortedBookmarks = useMemo(() => {
      return [...bookmarks].sort((a, b) => {
        // Calendar ascending by date id (YYYY-MM-DD), then timestamp
        if (a.id === b.id) return a.timestamp - b.timestamp;
        return a.id < b.id ? -1 : 1;
      });
    }, [bookmarks]);

    return {
      bookmarks: sortedBookmarks,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      loaded,
    };
  });


