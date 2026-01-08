/**
 * Review Modal Storage and Logic
 * 
 * Manages the early access review request modal state.
 * Only for version 1.9.2 - tracks shown count and timing.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const STORAGE_KEY = 'sd-review-modal-data';

// App Store IDs
const IOS_APP_ID = '6504628576'; // Your App Store ID
const ANDROID_PACKAGE = 'com.nealwagner.soberdailies';

interface ReviewModalData {
  shownCount: number;
  lastShownDate: string | null;
  userReviewed: boolean;
}

const DEFAULT_DATA: ReviewModalData = {
  shownCount: 0,
  lastShownDate: null,
  userReviewed: false,
};

/**
 * Get the current modal data from storage
 */
export async function getReviewModalData(): Promise<ReviewModalData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_DATA;
  } catch (error) {
    console.error('[ReviewModal] Error reading data:', error);
    return DEFAULT_DATA;
  }
}

/**
 * Save modal data to storage
 */
async function saveReviewModalData(data: ReviewModalData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[ReviewModal] Error saving data:', error);
  }
}

/**
 * Check if the modal should be shown
 */
export async function shouldShowReviewModal(): Promise<boolean> {
  const data = await getReviewModalData();
  
  // Never show if user already reviewed or hit max count
  if (data.userReviewed || data.shownCount >= 3) {
    return false;
  }
  
  // First time - always show
  if (data.shownCount === 0) {
    return true;
  }
  
  // Check if 7 days have passed since last shown
  if (data.lastShownDate) {
    const lastShown = new Date(data.lastShownDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 7;
  }
  
  return false;
}

/**
 * Record that the modal was shown (user tapped "Maybe Later")
 */
export async function recordModalShown(): Promise<void> {
  const data = await getReviewModalData();
  await saveReviewModalData({
    ...data,
    shownCount: data.shownCount + 1,
    lastShownDate: new Date().toISOString(),
  });
}

/**
 * Record that user tapped "Leave a Review"
 */
export async function recordUserReviewed(): Promise<void> {
  const data = await getReviewModalData();
  await saveReviewModalData({
    ...data,
    shownCount: data.shownCount + 1,
    lastShownDate: new Date().toISOString(),
    userReviewed: true,
  });
}

/**
 * Open the App Store review page
 */
export async function openAppStoreReview(): Promise<void> {
  let url: string;
  
  if (Platform.OS === 'ios') {
    url = `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review`;
  } else {
    url = `market://details?id=${ANDROID_PACKAGE}`;
  }
  
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to web URLs
      if (Platform.OS === 'ios') {
        await Linking.openURL(`https://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`);
      } else {
        await Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
      }
    }
  } catch (error) {
    console.error('[ReviewModal] Error opening store:', error);
  }
}

