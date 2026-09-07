import { useState, useEffect } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSobriety } from './useSobrietyStore';
import { formatLocalDate, parseLocalDate, calculateDaysBetween } from '@/lib/dateUtils';

const BIRTHDAY_STORAGE_KEY = 'last_shown_birthday_milestone';
const REPLAY_EVENT = 'sobriety-milestone-replay';

// The once-per-milestone guard is keyed on the sobriety DATE as well as the
// label. Keyed on the label alone, "1-year" stayed marked as seen forever, so
// entering a date exactly a year back never triggered the takeover again — it
// went straight to Today and only the milestone band could replay it. Including
// the date means a new date re-arms the celebration, while someone living
// through their real anniversary still sees it once.
export const milestoneSeenKey = (sobrietyDate: string, milestone: string) =>
  `${sobrietyDate}:${milestone}`;

// Re-run the milestone takeover on demand — the Today counter's badge taps
// this. Bypasses the once-per-milestone gate on purpose (it's a replay).
export const replaySobrietyMilestone = () => { DeviceEventEmitter.emit(REPLAY_EVENT); };

// "Is today exactly a milestone day?" — shared by the auto-show gate here,
// the takeover's own display, and the Today counter's badge.
export const calculateMilestone = (sobrietyDateString: string): string | null => {
    const today = formatLocalDate(new Date());
    const sobrietyDate = parseLocalDate(sobrietyDateString);
    
    // Monthly milestones (1-11 months)
    for (let months = 1; months <= 11; months++) {
      const milestoneDate = new Date(sobrietyDate);
      const originalDay = milestoneDate.getDate();
      
      // Add months
      milestoneDate.setMonth(milestoneDate.getMonth() + months);
      
      // If the day rolled over (e.g., Aug 31 -> Sept 31 -> Oct 1), 
      // set it to the last day of the target month instead
      if (milestoneDate.getDate() !== originalDay) {
        // Go back one day to get the last day of the target month
        milestoneDate.setDate(0);
      }
      
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

export const useSobrietyBirthday = () => {
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const { sobrietyDate } = useSobriety();

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
      
      const shouldShow = lastShown !== milestoneSeenKey(sobrietyDate, currentMilestone);
      console.log('[BirthdayHook] Should show birthday:', shouldShow);
      
      if (shouldShow) {
        // Opened immediately, NOT on a timer. The old 300ms delay was what let
        // Today paint first after saving a milestone date — you watched the
        // page arrive and then get covered. The takeover lives at the root of
        // the layout and is always mounted by the time this can fire, so
        // setting the flag straight away lands it in the same render pass.
        setShowBirthdayModal(true);
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

  // Re-check whenever the app returns to the foreground: a suspended app
  // resumes without remounting, so a milestone day that begins while the app
  // sits in the background would otherwise never be checked — and once the
  // day passes, that milestone is silently skipped forever. The
  // once-per-milestone storage guard above keeps this from double-showing.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && sobrietyDate) checkForBirthday();
    });
    return () => sub.remove();
  }, [sobrietyDate]);

  // Replay on demand (Today badge) — no gating; the badge only renders on an
  // actual milestone day.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(REPLAY_EVENT, () => setShowBirthdayModal(true));
    return () => sub.remove();
  }, []);

  const closeBirthdayModal = () => {
    // console.log('[BirthdayHook] Closing birthday modal');
    setShowBirthdayModal(false);
  };

  return {
    showBirthdayModal,
    closeBirthdayModal,
  };
};
