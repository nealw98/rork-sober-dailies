import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface GratitudeEntry {
  date: string;
  items: string[];
  completed: boolean;
}

export interface SavedGratitudeEntry {
  date: string;
  timestamp: number;
  items: string[];
}

export interface WeeklyProgressDay {
  date: string;
  completed: boolean;
  itemCount: number;
  dayName: string;
  isFuture: boolean;
  isToday: boolean;
}

const STORAGE_KEY = 'gratitude_entries';
const SAVED_ENTRIES_KEY = 'saved_gratitude_entries';
const MAX_SAVED_ENTRIES = 200;

export const [GratitudeProvider, useGratitudeStore] = createContextHook(() => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [savedEntries, setSavedEntries] = useState<SavedGratitudeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
    loadSavedEntries();
  }, []);

  // One-time test data seeding (for QA) – seeds entries for the last two days if missing
  useEffect(() => {
    (async () => {
      try {
        if (isLoading) return;
        const qaSeedKey = 'gratitude_test_seed_v1';
        const alreadySeeded = await AsyncStorage.getItem(qaSeedKey);
        if (alreadySeeded) return;
        
        const today = new Date();
        const fmt = (d: Date) => {
          const y = d.getFullYear();
          const m = (d.getMonth() + 1).toString().padStart(2, '0');
          const day = d.getDate().toString().padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        const d0 = new Date(today);
        const d1 = new Date(today); d1.setDate(today.getDate() - 1);
        const d2 = new Date(today); d2.setDate(today.getDate() - 2);
        const dates = [fmt(d2), fmt(d1)];
        
        let changed = false;
        const updatedEntries = [...entries];
        dates.forEach(ds => {
          if (!updatedEntries.find(e => e.date === ds)) {
            updatedEntries.push({ date: ds, items: ['Seeded entry'], completed: true });
            changed = true;
          }
        });
        if (changed) {
          console.log('Gratitude QA seed: adding seeded entries for', dates);
          saveEntries(updatedEntries);
        }
        await AsyncStorage.setItem(qaSeedKey, '1');
      } catch (e) {
        console.log('Gratitude QA seed error:', (e as any)?.message || e);
      }
    })();
  }, [isLoading, entries]);

  // Synchronize entries with savedEntries to ensure weekly progress is accurate
  useEffect(() => {
    if (!isLoading && savedEntries.length > 0) {
      console.log('Synchronizing entries with savedEntries for weekly progress...');
      console.log('Current entries:', entries.map(e => `${e.date} (completed: ${e.completed})`));
      console.log('Current savedEntries:', savedEntries.map(e => e.date));
      
      // Create a map of existing entries for quick lookup
      const entriesMap = new Map();
      entries.forEach(entry => entriesMap.set(entry.date, entry));
      
      // Check if any savedEntries are missing from entries or not marked as completed
      let needsUpdate = false;
      const updatedEntries = [...entries];
      const today = new Date();
      const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      savedEntries.forEach(savedEntry => {
        const existingEntry = entriesMap.get(savedEntry.date);
        
        if (!existingEntry) {
          // Do not auto-complete today while the user might be editing
          if (savedEntry.date === todayString) {
            return;
          }
          console.log(`Adding missing entry for ${savedEntry.date} to entries array`);
          updatedEntries.push({ date: savedEntry.date, items: savedEntry.items, completed: true });
          needsUpdate = true;
        } else if (!existingEntry.completed) {
          // If this is today's entry and it's intentionally uncompleted (editing), skip
          if (savedEntry.date === todayString) {
            return;
          }
          // Entry exists but is not marked as completed (for past days) → mark completed
          console.log(`Updating entry for ${savedEntry.date} to be marked as completed`);
          const index = updatedEntries.findIndex(e => e.date === savedEntry.date);
          if (index >= 0) {
            updatedEntries[index] = {
              ...updatedEntries[index],
              completed: true
            };
            needsUpdate = true;
          }
        }
      });
      
      // If we found missing entries or entries to update, update the entries array
      if (needsUpdate) {
        console.log('Updating entries with missing/corrected saved entries');
        saveEntries(updatedEntries);
      } else {
        console.log('No entries need updating');
      }
    }
  }, [isLoading, savedEntries, entries]);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedEntries = JSON.parse(stored);
        console.log('Gratitude - Loaded entries:', parsedEntries.length, 'entries');
        console.log('Gratitude - Entry dates:', parsedEntries.map(e => e.date));
        setEntries(parsedEntries);
      } else {
        console.log('Gratitude - No stored entries found');
      }
    } catch (error) {
      console.error('Error loading gratitude entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_ENTRIES_KEY);
      if (stored) {
        setSavedEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved gratitude entries:', error);
    }
  };

  const saveSavedEntries = async (newSavedEntries: SavedGratitudeEntry[]) => {
    try {
      await AsyncStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(newSavedEntries));
      setSavedEntries(newSavedEntries);
    } catch (error) {
      console.error('Error saving saved gratitude entries:', error);
    }
  };

  const saveEntries = async (newEntries: GratitudeEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (error) {
      console.error('Error saving gratitude entries:', error);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    // Ensure we're working in local timezone
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log('gratitude getTodayDateString:', dateString, 'timezone offset:', today.getTimezoneOffset());
    return dateString;
  };

  const isCompletedToday = useCallback(() => {
    const todayString = getTodayDateString();
    return entries.some(entry => entry.date === todayString && entry.completed);
  }, [entries]);

  const getTodayEntry = useCallback((): GratitudeEntry | null => {
    const todayString = getTodayDateString();
    return entries.find(entry => entry.date === todayString) || null;
  }, [entries]);

  const getTodaysItems = useCallback((): string[] => {
    const todayEntry = getTodayEntry();
    return todayEntry ? todayEntry.items : [];
  }, [getTodayEntry]);

  const addItemsToToday = useCallback((newItems: string[]) => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    let currentItems: string[] = [];
    if (existingIndex >= 0) {
      currentItems = entries[existingIndex].items;
    }
    
    const updatedItems = [...currentItems, ...newItems.filter(item => item.trim() !== '')];
    
    const newEntry: GratitudeEntry = {
      date: todayString,
      items: updatedItems,
      completed: false
    };

    let newEntries: GratitudeEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = newEntry;
    } else {
      newEntries = [...entries, newEntry];
    }

    saveEntries(newEntries);
  }, [entries]);

  // Replace the entire list of items for today (used for inline edit)
  const updateItemsForToday = useCallback((updatedItems: string[]) => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);

    const newEntry: GratitudeEntry = {
      date: todayString,
      items: updatedItems.filter(item => item.trim() !== ''),
      // Keep as not completed while editing; completion flow will set true
      completed: false,
    };

    let newEntries: GratitudeEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = { ...newEntries[existingIndex], ...newEntry };
    } else {
      newEntries = [...entries, newEntry];
    }

    saveEntries(newEntries);
  }, [entries]);

  // Delete a single item by index for today's list
  const deleteItemForToday = useCallback((index: number) => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    if (existingIndex < 0) return;

    const currentItems = entries[existingIndex].items || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);

    const newEntries = [...entries];
    newEntries[existingIndex] = {
      ...newEntries[existingIndex],
      items: updatedItems,
      completed: false,
    };
    saveEntries(newEntries);
  }, [entries]);

  const completeToday = useCallback((items: string[]) => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    const newEntry: GratitudeEntry = {
      date: todayString,
      items: items.filter(item => item.trim() !== ''),
      completed: true
    };

    let newEntries: GratitudeEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = newEntry;
    } else {
      newEntries = [...entries, newEntry];
    }

    saveEntries(newEntries);
  }, [entries]);

  const saveGratitudeList = useCallback((items: string[]) => {
    completeToday(items);
  }, [completeToday]);

  const uncompleteToday = useCallback(() => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    if (existingIndex >= 0) {
      const newEntries = [...entries];
      newEntries[existingIndex] = { ...newEntries[existingIndex], completed: false };
      saveEntries(newEntries);
    }
  }, [entries]);

  const getWeeklyProgress = useCallback((): WeeklyProgressDay[] => {
    const today = new Date();
    const todayString = getTodayDateString();
    console.log('getWeeklyProgress - Today string:', todayString);
    console.log('getWeeklyProgress - Today timezone offset:', today.getTimezoneOffset());
    
    // Create start of week in local timezone - ensure we're working with local dates
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start from Sunday
    
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const entry = entries.find(entry => entry.date === dateString);
      const completed = entry ? entry.completed : false;
      const itemCount = entry ? entry.items.length : 0;
      
      // Compare date strings instead of Date objects to avoid time zone issues
      const isFuture = dateString > todayString;
      const isToday = dateString === todayString;
      
      console.log(`getWeeklyProgress - Day ${index} (${date.toLocaleDateString('en-US', { weekday: 'short' })}):`, {
        dateString,
        completed,
        isToday,
        isFuture,
        hasEntry: !!entry,
        todayString,
        comparison: `${dateString} vs ${todayString}`
      });
      
      return {
        date: dateString,
        completed,
        itemCount,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isFuture,
        isToday
      };
    });
    
    console.log('getWeeklyProgress - All entries dates:', entries.map(e => e.date));
    console.log('getWeeklyProgress - Today\'s entry exists:', entries.some(e => e.date === todayString));
    return weekDays;
  }, [entries]);

  const getWeeklyStreak = useCallback((): number => {
    const weeklyProgress = getWeeklyProgress();
    return weeklyProgress.filter(day => {
      return day.completed && !day.isFuture;
    }).length;
  }, [getWeeklyProgress]);

  const saveDetailedEntry = useCallback((items: string[], dateString?: string) => {
    const targetDate = dateString || getTodayDateString();
    
    console.log('saveDetailedEntry - Saving entry for date:', targetDate);
    console.log('saveDetailedEntry - Current saved entries count:', savedEntries.length);
    
    // Remove existing entry for this date if it exists
    const filteredEntries = savedEntries.filter(entry => entry.date !== targetDate);
    
    // Add new entry
    const newEntry: SavedGratitudeEntry = {
      date: targetDate,
      timestamp: Date.now(),
      items: items.filter(item => item.trim() !== '')
    };
    
    console.log('saveDetailedEntry - New entry:', { date: newEntry.date, timestamp: newEntry.timestamp, itemCount: newEntry.items.length });
    
    // Keep only the most recent MAX_SAVED_ENTRIES entries
    const updatedEntries = [newEntry, ...filteredEntries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SAVED_ENTRIES);
    
    console.log('saveDetailedEntry - Updated entries count:', updatedEntries.length);
    console.log('saveDetailedEntry - Updated entries dates:', updatedEntries.map(e => e.date));
    
    saveSavedEntries(updatedEntries);
    
    // IMPORTANT: Also update the entries array to ensure weekly progress is accurate
    // This ensures consistency between savedEntries and entries
    const existingEntryIndex = entries.findIndex(entry => entry.date === targetDate);
    const newProgressEntry: GratitudeEntry = {
      date: targetDate,
      items: newEntry.items,
      completed: true
    };
    
    let newEntries;
    if (existingEntryIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingEntryIndex] = newProgressEntry;
    } else {
      newEntries = [...entries, newProgressEntry];
    }
    
    console.log('saveDetailedEntry - Also updating entries array for weekly progress');
    saveEntries(newEntries);
  }, [savedEntries, entries]);

  const getSavedEntry = useCallback((dateString: string): SavedGratitudeEntry | null => {
    return savedEntries.find(entry => entry.date === dateString) || null;
  }, [savedEntries]);

  const deleteSavedEntry = useCallback((dateString: string) => {
    const filteredEntries = savedEntries.filter(entry => entry.date !== dateString);
    saveSavedEntries(filteredEntries);
  }, [savedEntries]);

  const getCompletedDaysInLast30 = useCallback((): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoff && entry.completed;
    }).length;
  }, [entries]);

  return useMemo(() => ({
    entries,
    savedEntries,
    isLoading,
    isCompletedToday,
    getTodayEntry,
    getTodaysItems,
    addItemsToToday,
    updateItemsForToday,
    deleteItemForToday,
    completeToday,
    saveGratitudeList,
    uncompleteToday,
    getWeeklyProgress,
    getWeeklyStreak,
    saveDetailedEntry,
    getSavedEntry,
    deleteSavedEntry,
    getCompletedDaysInLast30
  }), [
    entries,
    savedEntries,
    isLoading,
    isCompletedToday,
    getTodayEntry,
    getTodaysItems,
    addItemsToToday,
    completeToday,
    saveGratitudeList,
    uncompleteToday,
    getWeeklyProgress,
    getWeeklyStreak,
    saveDetailedEntry,
    getSavedEntry,
    deleteSavedEntry,
    getCompletedDaysInLast30
  ]);
});