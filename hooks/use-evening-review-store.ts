import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

interface ReviewAnswers {
  resentful: boolean;
  selfish: boolean;
  fearful: boolean;
  apology: boolean;
  kindness: boolean;
  spiritual: boolean;
  aaTalk: boolean;
  prayerMeditation: boolean;
}

interface EveningReviewEntry {
  date: string;
  timestamp: number;
  answers: ReviewAnswers;
  notes?: string;
}

interface WeeklyProgressDay {
  date: string;
  completed: boolean;
  yesCount: number;
  dayName: string;
  isFuture: boolean;
  isToday: boolean;
}

interface DetailedEveningEntry {
  resentfulFlag: string;
  resentfulNote: string;
  selfishFlag: string;
  selfishNote: string;
  fearfulFlag: string;
  fearfulNote: string;
  apologyFlag: string;
  apologyName: string;
  kindnessFlag: string;
  kindnessNote: string;
  spiritualFlag: string;
  spiritualNote: string;
  prayerMeditationFlag: string;
  stayedSober: boolean;
  prayedOrMeditated: boolean;
  practicedGratitude: boolean;
  readAALiterature: boolean;
  talkedToAlcoholic: boolean;
  didSomethingForOthers: boolean;
  reflectionResentful?: string;
  reflectionApology?: string;
  reflectionShared?: string;
  reflectionOthers?: string;
  reflectionKind?: string;
  reflectionWell?: string;
  reflectionBetter?: string;
}

interface SavedEveningEntry {
  date: string;
  timestamp: number;
  data: DetailedEveningEntry;
}

const STORAGE_KEY = 'evening_review_entries';

const SAVED_ENTRIES_KEY = 'saved_evening_review_entries';
const MAX_SAVED_ENTRIES = 200;

export const [EveningReviewProvider, useEveningReviewStore] = createContextHook(() => {
  const [entries, setEntries] = useState<EveningReviewEntry[]>([]);
  const [savedEntries, setSavedEntries] = useState<SavedEveningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
    loadSavedEntries();
  }, []);

  // Synchronize entries with savedEntries to ensure weekly progress is accurate
  useEffect(() => {
    if (!isLoading && savedEntries.length > 0) {
      console.log('Synchronizing evening review entries with savedEntries for weekly progress...');
      console.log('Current entries:', entries.map(e => e.date));
      console.log('Current savedEntries:', savedEntries.map(e => e.date));
      
      // Create a map of existing entries for quick lookup
      const entriesMap = new Map();
      entries.forEach(entry => entriesMap.set(entry.date, entry));
      
      // Check if any savedEntries are missing from entries
      let needsUpdate = false;
      const updatedEntries = [...entries];
      
      savedEntries.forEach(savedEntry => {
        const existingEntry = entriesMap.get(savedEntry.date);
        
        if (!existingEntry) {
          // This saved entry is not in entries, add it
          console.log(`Adding missing evening review entry for ${savedEntry.date} to entries array`);
          
          // Create default answers based on the saved entry data
          const answers: ReviewAnswers = {
            resentful: savedEntry.data.stayedSober || savedEntry.data.resentfulFlag === 'yes' || false,
            selfish: savedEntry.data.prayedOrMeditated || savedEntry.data.selfishFlag === 'yes' || false,
            fearful: savedEntry.data.practicedGratitude || savedEntry.data.fearfulFlag === 'yes' || false,
            apology: savedEntry.data.readAALiterature || savedEntry.data.apologyFlag === 'yes' || false,
            kindness: savedEntry.data.talkedToAlcoholic || savedEntry.data.kindnessFlag === 'yes' || false,
            spiritual: savedEntry.data.didSomethingForOthers || savedEntry.data.spiritualFlag !== '' || false,
            aaTalk: false,
            prayerMeditation: savedEntry.data.prayedOrMeditated || savedEntry.data.prayerMeditationFlag === 'yes' || false
          };
          
          updatedEntries.push({
            date: savedEntry.date,
            timestamp: savedEntry.timestamp,
            answers: answers,
            notes: undefined
          });
          needsUpdate = true;
        } else {
          // Check if any of the answers are false but should be true based on the saved entry
          const hasAnyAnswer = Object.values(existingEntry.answers).some(Boolean);
          if (!hasAnyAnswer) {
            console.log(`Updating entry for ${savedEntry.date} to ensure it has answers`);
            
            // Create updated answers based on the saved entry data
            const answers: ReviewAnswers = {
              resentful: savedEntry.data.stayedSober || savedEntry.data.resentfulFlag === 'yes' || false,
              selfish: savedEntry.data.prayedOrMeditated || savedEntry.data.selfishFlag === 'yes' || false,
              fearful: savedEntry.data.practicedGratitude || savedEntry.data.fearfulFlag === 'yes' || false,
              apology: savedEntry.data.readAALiterature || savedEntry.data.apologyFlag === 'yes' || false,
              kindness: savedEntry.data.talkedToAlcoholic || savedEntry.data.kindnessFlag === 'yes' || false,
              spiritual: savedEntry.data.didSomethingForOthers || savedEntry.data.spiritualFlag !== '' || false,
              aaTalk: false,
              prayerMeditation: savedEntry.data.prayedOrMeditated || savedEntry.data.prayerMeditationFlag === 'yes' || false
            };
            
            // Force at least one answer to be true to ensure it's considered completed
            if (!Object.values(answers).some(Boolean)) {
              answers.resentful = true;
            }
            
            const index = updatedEntries.findIndex(e => e.date === savedEntry.date);
            if (index >= 0) {
              updatedEntries[index] = {
                ...updatedEntries[index],
                answers: answers
              };
              needsUpdate = true;
            }
          }
        }
      });
      
      // If we found missing entries, update the entries array
      if (needsUpdate) {
        console.log('Updating evening review entries with missing/corrected saved entries');
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
        console.log('Evening Review - Loaded entries:', parsedEntries.length, 'entries');
        console.log('Evening Review - Entry dates:', parsedEntries.map(e => e.date));
        setEntries(parsedEntries);
      } else {
        console.log('Evening Review - No stored entries found');
      }
    } catch (error) {
      console.error('Error loading evening review entries:', error);
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
      console.error('Error loading saved evening review entries:', error);
    }
  };

  const saveSavedEntries = async (newSavedEntries: SavedEveningEntry[]) => {
    try {
      await AsyncStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(newSavedEntries));
      setSavedEntries(newSavedEntries);
    } catch (error) {
      console.error('Error saving saved evening review entries:', error);
    }
  };

  const saveEntries = async (newEntries: EveningReviewEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (error) {
      console.error('Error saving evening review entries:', error);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    // Ensure we're working in local timezone
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    console.log('getTodayDateString:', dateString, 'timezone offset:', today.getTimezoneOffset());
    return dateString;
  };

  const isCompletedToday = () => {
    const todayString = getTodayDateString();
    return entries.some(entry => entry.date === todayString);
  };

  const completeToday = (answers: ReviewAnswers) => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    const newEntry: EveningReviewEntry = {
      date: todayString,
      timestamp: Date.now(),
      answers,
      notes: undefined
    };

    let newEntries: EveningReviewEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = newEntry;
    } else {
      newEntries = [...entries, newEntry];
    }

    saveEntries(newEntries);
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
      // An entry is considered completed if it exists and has at least one answer
      const completed = !!entry && Object.values(entry.answers).some(Boolean);
      const yesCount = entry ? Object.values(entry.answers).filter(Boolean).length : 0;
      
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
        yesCount,
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

  const uncompleteToday = () => {
    const todayString = getTodayDateString();
    const existingIndex = entries.findIndex(entry => entry.date === todayString);
    
    if (existingIndex >= 0) {
      const newEntries = [...entries];
      newEntries.splice(existingIndex, 1);
      saveEntries(newEntries);
    }
  };

  const saveDetailedEntry = (detailedEntry: DetailedEveningEntry, dateString?: string) => {
    const targetDate = dateString || getTodayDateString();
    
    console.log('saveDetailedEntry - Saving entry for date:', targetDate);
    console.log('saveDetailedEntry - Current saved entries count:', savedEntries.length);
    
    // Remove existing entry for this date if it exists
    const filteredEntries = savedEntries.filter(entry => entry.date !== targetDate);
    
    // Add new entry
    const newEntry: SavedEveningEntry = {
      date: targetDate,
      timestamp: Date.now(),
      data: detailedEntry
    };
    
    console.log('saveDetailedEntry - New entry:', { date: newEntry.date, timestamp: newEntry.timestamp });
    
    // Keep only the most recent MAX_SAVED_ENTRIES entries
    const updatedEntries = [newEntry, ...filteredEntries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SAVED_ENTRIES);
    
    console.log('saveDetailedEntry - Updated entries count:', updatedEntries.length);
    console.log('saveDetailedEntry - Updated entries dates:', updatedEntries.map(e => e.date));
    
    saveSavedEntries(updatedEntries);
    
    // Create answers for the entries array
    const answers: ReviewAnswers = {
      resentful: detailedEntry.stayedSober || detailedEntry.resentfulFlag === 'yes' || false,
      selfish: detailedEntry.prayedOrMeditated || detailedEntry.selfishFlag === 'yes' || false,
      fearful: detailedEntry.practicedGratitude || detailedEntry.fearfulFlag === 'yes' || false,
      apology: detailedEntry.readAALiterature || detailedEntry.apologyFlag === 'yes' || false,
      kindness: detailedEntry.talkedToAlcoholic || detailedEntry.kindnessFlag === 'yes' || false,
      spiritual: detailedEntry.didSomethingForOthers || detailedEntry.spiritualFlag !== '' || false,
      aaTalk: false,
      prayerMeditation: detailedEntry.prayedOrMeditated || detailedEntry.prayerMeditationFlag === 'yes' || false
    };
    
    // IMPORTANT: Always update entries array for any date, not just today
    // This ensures the weekly progress tracker is accurate for all saved entries
    const existingEntryIndex = entries.findIndex(entry => entry.date === targetDate);
    const newProgressEntry: EveningReviewEntry = {
      date: targetDate,
      timestamp: Date.now(),
      answers: answers,
      notes: undefined
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
  };

  const getSavedEntry = (dateString: string): SavedEveningEntry | null => {
    return savedEntries.find(entry => entry.date === dateString) || null;
  };

  const deleteSavedEntry = (dateString: string) => {
    const filteredEntries = savedEntries.filter(entry => entry.date !== dateString);
    saveSavedEntries(filteredEntries);
  };

  const getTodaysAnswers = (): ReviewAnswers | null => {
    const todayString = getTodayDateString();
    const entry = entries.find(entry => entry.date === todayString);
    return entry ? entry.answers : null;
  };

  const getTodayEntry = (): EveningReviewEntry | null => {
    const todayString = getTodayDateString();
    return entries.find(entry => entry.date === todayString) || null;
  };

  const getThirtyDayCounts = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoff;
    });

    return {
      completedDays: recentEntries.length,
      resentfulCount: recentEntries.filter(e => e.answers.resentful).length,
      selfishCount: recentEntries.filter(e => e.answers.selfish).length,
      fearfulCount: recentEntries.filter(e => e.answers.fearful).length,
      apologyCount: recentEntries.filter(e => e.answers.apology).length,
      kindnessCount: recentEntries.filter(e => e.answers.kindness).length,
      spiritualCount: recentEntries.filter(e => e.answers.spiritual).length,
      aaTalkCount: recentEntries.filter(e => e.answers.aaTalk).length,
      prayerMeditationCount: recentEntries.filter(e => e.answers.prayerMeditation).length,
    };
  };

  const getTodayProgress = () => {
    const todayString = getTodayDateString();
    const entry = entries.find(entry => entry.date === todayString);
    return {
      completed: !!entry,
      yesCount: entry ? Object.values(entry.answers).filter(Boolean).length : 0
    };
  };

  return {
    getTodaysAnswers,
    isCompletedToday,
    completeToday,
    getWeeklyProgress,
    getThirtyDayCounts,
    getTodayProgress,
    entries,
    isLoading,
    uncompleteToday,
    getWeeklyStreak,
    saveDetailedEntry,
    getTodayEntry,
    savedEntries,
    getSavedEntry,
    deleteSavedEntry
  };
});