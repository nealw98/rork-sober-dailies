import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface GratitudeEntry {
  date: string;
  items: string[];
  completed: boolean;
}

const STORAGE_KEY = 'gratitude_entries';

export const [GratitudeProvider, useGratitudeStore] = createContextHook(() => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
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
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    isLoading,
    isCompletedToday,
    getTodayEntry,
    getTodaysItems,
    addItemsToToday,
    completeToday,
    saveGratitudeList,
    uncompleteToday,
    getCompletedDaysInLast30
  };
});