import { useState, useEffect } from 'react';
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

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
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

  const isCompletedToday = () => {
    const todayString = getTodayDateString();
    return entries.some(entry => entry.date === todayString && entry.completed);
  };

  const getTodayEntry = (): GratitudeEntry | null => {
    const todayString = getTodayDateString();
    return entries.find(entry => entry.date === todayString) || null;
  };

  const getTodaysItems = (): string[] => {
    const todayEntry = getTodayEntry();
    return todayEntry ? todayEntry.items : [];
  };

  const addItemsToToday = (newItems: string[]) => {
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
  };

  const completeToday = (items: string[]) => {
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
  };

  const saveGratitudeList = (items: string[]) => {
    completeToday(items);
  };

  const uncompleteToday = () => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    if (existingIndex >= 0) {
      const newEntries = [...entries];
      newEntries[existingIndex] = { ...newEntries[existingIndex], completed: false };
      saveEntries(newEntries);
    }
  };

  const getWeeklyProgress = (): WeeklyProgressDay[] => {
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
  };

  const getWeeklyStreak = (): number => {
    const weeklyProgress = getWeeklyProgress();
    return weeklyProgress.filter(day => {
      return day.completed && !day.isFuture;
    }).length;
  };

  const saveDetailedEntry = (items: string[], dateString?: string) => {
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
    
    // Also update the completion tracking
    if (targetDate === getTodayDateString()) {
      completeToday(items);
    }
  };

  const getSavedEntry = (dateString: string): SavedGratitudeEntry | null => {
    return savedEntries.find(entry => entry.date === dateString) || null;
  };

  const deleteSavedEntry = (dateString: string) => {
    const filteredEntries = savedEntries.filter(entry => entry.date !== dateString);
    saveSavedEntries(filteredEntries);
  };

  const getCompletedDaysInLast30 = (): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoff && entry.completed;
    }).length;
  };

  return {
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
  };
});