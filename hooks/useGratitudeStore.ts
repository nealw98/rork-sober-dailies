import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const STORAGE_KEY = 'gratitude_data';

interface GratitudeData {
  [date: string]: {
    items: string[];
    completedAt: string;
  };
}

export const [GratitudeProvider, useGratitudeStore] = createContextHook(() => {
  const [completedDays, setCompletedDays] = useState<GratitudeData>({});

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData) {
          setCompletedDays(JSON.parse(savedData));
        }
      } catch (error) {
        console.error('Error parsing gratitude data:', error);
      }
    };
    
    loadData();
  }, []);

  // Save data to AsyncStorage whenever completedDays changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completedDays));
      } catch (error) {
        console.error('Error saving gratitude data:', error);
      }
    };
    
    saveData();
  }, [completedDays]);

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const isCompletedToday = () => {
    const today = getTodayString();
    return !!completedDays[today];
  };

  const getTodaysItems = () => {
    const today = getTodayString();
    return completedDays[today]?.items || [];
  };

  const completeToday = (items: string[]) => {
    const today = getTodayString();
    setCompletedDays(prev => ({
      ...prev,
      [today]: {
        items,
        completedAt: new Date().toISOString()
      }
    }));
  };

  const uncompleteToday = () => {
    const today = getTodayString();
    setCompletedDays(prev => {
      const newData = { ...prev };
      delete newData[today];
      return newData;
    });
  };

  const addItemsToToday = (newItems: string[]) => {
    const today = getTodayString();
    const existingItems = getTodaysItems();
    const allItems = [...existingItems, ...newItems];
    
    setCompletedDays(prev => ({
      ...prev,
      [today]: {
        items: allItems,
        completedAt: prev[today]?.completedAt || new Date().toISOString()
      }
    }));
  };

  const getWeeklyGratitudeProgress = () => {
    const today = new Date();
    const progress = [];
    
    // Get current week (Sunday to Saturday) - same logic as evening review
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday is day 0, so subtract day number
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const isFuture = date > today;
      
      progress.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        completed: !!completedDays[dateStr],
        isFuture
      });
    }
    
    return progress;
  };

  const getGratitudeDaysCount = () => {
    return Object.keys(completedDays).length;
  };

  const get7DayGratitudeDaysCount = () => {
    const today = new Date();
    let count = 0;
    
    // Iterate through the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      if (completedDays[dateKey]) {
        count++;
      }
    }
    
    return count;
  };





  return {
    isCompletedToday,
    getTodaysItems,
    completeToday,
    uncompleteToday,
    addItemsToToday,
    getWeeklyGratitudeProgress,
    getGratitudeDaysCount,
    get7DayGratitudeDaysCount
  };
});