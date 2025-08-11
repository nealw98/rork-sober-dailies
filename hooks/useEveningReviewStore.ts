import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { getDateKey } from '@/utils/dateUtils';

const STORAGE_KEY = 'aa-evening-review';

export interface DailyReviewAnswers {
  resentful: boolean;
  selfish: boolean;
  fearful: boolean;
  apology: boolean;
  kindness: boolean;
  spiritual: boolean;
  aaTalk: boolean;
  prayerMeditation: boolean;
}

export interface EveningReviewData {
  [date: string]: DailyReviewAnswers;
}

export const [EveningReviewProvider, useEveningReviewStore] = createContextHook(() => {
  const [completedDays, setCompletedDays] = useState<EveningReviewData>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setCompletedDays(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading evening review data:', error);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completedDays));
      } catch (error) {
        console.error('Error saving evening review data:', error);
      }
    };
    
    saveData();
  }, [completedDays]);

  const getTodayKey = () => {
    return new Date().toISOString().split('T')[0];
  };

  const isCompletedToday = (): boolean => {
    return completedDays[getTodayKey()] !== undefined;
  };

  const completeToday = (answers: DailyReviewAnswers) => {
    const today = getTodayKey();
    setCompletedDays(prev => ({
      ...prev,
      [today]: answers
    }));
  };

  const uncompleteToday = () => {
    const today = getTodayKey();
    setCompletedDays(prev => {
      const updated = { ...prev };
      delete updated[today];
      return updated;
    });
  };

  const getWeeklyProgress = () => {
    const today = new Date();
    const weekDays = [];
    
    // Get current week (Sunday to Saturday)
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday is day 0, so subtract day number
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      weekDays.push({
        date: dateKey,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: completedDays[dateKey] !== undefined,
        isToday: dateKey === getTodayKey(),
        isFuture: date > today
      });
    }
    
    return weekDays;
  };

  const getWeeklyStreak = () => {
    const weekDays = getWeeklyProgress();
    const completedThisWeek = weekDays.filter(day => day.completed && !day.isFuture).length;
    return completedThisWeek;
  };

  const get30DayInsights = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    let completedCount = 0;
    let resentfulCount = 0;
    let selfishCount = 0;
    let fearfulCount = 0;
    let apologyCount = 0;
    let kindnessCount = 0;
    let spiritualCount = 0;
    let aaTalkCount = 0;
    let prayerMeditationCount = 0;
    
    // Iterate through the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayData = completedDays[dateKey];
      if (dayData) {
        completedCount++;
        if (dayData.resentful) resentfulCount++;
        if (dayData.selfish) selfishCount++;
        if (dayData.fearful) fearfulCount++;
        if (dayData.apology) apologyCount++;
        if (dayData.kindness) kindnessCount++;
        if (dayData.spiritual) spiritualCount++;
        if (dayData.aaTalk) aaTalkCount++;
        if (dayData.prayerMeditation) prayerMeditationCount++;
      }
    }
    
    return {
      completedDays: completedCount,
      resentfulCount,
      selfishCount, 
      fearfulCount,
      apologyCount,
      kindnessCount,
      spiritualCount,
      aaTalkCount,
      prayerMeditationCount,
    };
  };

  const get7DayInsights = () => {
    const today = new Date();
    
    let completedCount = 0;
    let resentfulCount = 0;
    let selfishCount = 0;
    let fearfulCount = 0;
    let apologyCount = 0;
    let kindnessCount = 0;
    let spiritualCount = 0;
    let aaTalkCount = 0;
    let prayerMeditationCount = 0;
    
    // Iterate through the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayData = completedDays[dateKey];
      if (dayData) {
        completedCount++;
        if (dayData.resentful) resentfulCount++;
        if (dayData.selfish) selfishCount++;
        if (dayData.fearful) fearfulCount++;
        if (dayData.apology) apologyCount++;
        if (dayData.kindness) kindnessCount++;
        if (dayData.spiritual) spiritualCount++;
        if (dayData.aaTalk) aaTalkCount++;
        if (dayData.prayerMeditation) prayerMeditationCount++;
      }
    }
    
    return {
      completedDays: completedCount,
      resentfulCount,
      selfishCount, 
      fearfulCount,
      apologyCount,
      kindnessCount,
      spiritualCount,
      aaTalkCount,
      prayerMeditationCount,
    };
  };



  const getTodaysAnswers = (): DailyReviewAnswers | null => {
    const today = getTodayKey();
    return completedDays[today] || null;
  };

  return {
    isCompletedToday,
    completeToday,
    uncompleteToday,
    getWeeklyProgress,
    getWeeklyStreak,
    get30DayInsights,
    get7DayInsights,
    getTodaysAnswers
  };
});