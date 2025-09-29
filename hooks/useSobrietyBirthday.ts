import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSobriety } from './useSobrietyStore';
import { formatLocalDate, parseLocalDate, calculateDaysBetween } from '@/lib/dateUtils';

const BIRTHDAY_STORAGE_KEY = 'last_shown_birthday_milestone';

export const useSobrietyBirthday = () => {
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const { sobrietyDate } = useSobriety();

  // Calculate milestone based on sobriety date (same logic as in SobrietyBirthdayModal)
  const calculateMilestone = (sobrietyDateString: string): string | null => {
    const today = formatLocalDate(new Date());
    const sobrietyDate = parseLocalDate(sobrietyDateString);
    
    // Monthly milestones (1-11 months)
    for (let months = 1; months <= 11; months++) {
      const milestoneDate = new Date(sobrietyDate);
      milestoneDate.setMonth(milestoneDate.getMonth() + months);
      const milestoneDateString = formatLocalDate(milestoneDate);
      
      if (milestoneDateString === today) {
        return `${months}-month`;
      }
    }
    
    // Yearly milestones starting from 1 year
    for (let years = 1; years <= 100; years++) {
      const milestoneDate = new Date(sobrietyDate);
      milestoneDate.setFullYear(milestoneDate.getFullYear() + years);
      const milestoneDateString = formatLocalDate(milestoneDate);
      
      if (milestoneDateString === today) {
        if (years === 1) return '1-year';
        if (years === 2) return '2-year';
        if (years === 3) return '3-year';
        if (years === 4) return '4-year';
        if (years === 5) return '5-year';
        return `${years}-year`;
      }
    }
    
    // Check for 18-month milestone
    const eighteenMonthDate = new Date(sobrietyDate);
    eighteenMonthDate.setMonth(eighteenMonthDate.getMonth() + 18);
    const eighteenMonthDateString = formatLocalDate(eighteenMonthDate);
    
    if (eighteenMonthDateString === today) {
      return '18-month';
    }
    
    return null;
  };

  // Check if we should show birthday modal
  const checkForBirthday = async () => {
    if (!sobrietyDate) {
      console.log('[BirthdayHook] No sobriety date, not checking');
      return;
    }

    // console.log('[BirthdayHook] Checking for birthday milestone...');
    
    const currentMilestone = calculateMilestone(sobrietyDate);
    // console.log('[BirthdayHook] Current milestone:', currentMilestone);
    
    if (!currentMilestone) {
      console.log('[BirthdayHook] No milestone found, not showing');
      return;
    }
    
    try {
      const lastShown = await AsyncStorage.getItem(BIRTHDAY_STORAGE_KEY);
      // console.log('[BirthdayHook] Last shown milestone:', lastShown, 'Current milestone:', currentMilestone);
      
      const shouldShow = lastShown !== currentMilestone;
      console.log('[BirthdayHook] Should show birthday:', shouldShow);
      
      if (shouldShow) {
        // Small delay to ensure the modal can render properly
        setTimeout(() => {
          // console.log('[BirthdayHook] Setting showBirthdayModal to true');
          setShowBirthdayModal(true);
        }, 1000);
      }
    } catch (error) {
      console.error('[BirthdayHook] Error checking birthday storage:', error);
    }
  };

  // Check for birthday milestones when sobriety date changes
  useEffect(() => {
    if (sobrietyDate) {
      // console.log('[BirthdayHook] Sobriety date changed, checking for birthday');
      checkForBirthday();
    }
  }, [sobrietyDate]);

  // Check for birthdays on first app launch of the day
  useEffect(() => {
    if (sobrietyDate) {
      // console.log('[BirthdayHook] App launched, checking for birthday');
      checkForBirthday();
    }
  }, []); // Empty dependency array = runs on every mount (app launch)

  const closeBirthdayModal = () => {
    // console.log('[BirthdayHook] Closing birthday modal');
    setShowBirthdayModal(false);
  };

  return {
    showBirthdayModal,
    closeBirthdayModal,
  };
};
