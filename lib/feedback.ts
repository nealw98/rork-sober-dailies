import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getAnonymousId } from './usageLogger';

export interface FeedbackSubmission {
  feedbackText: string;
  contactInfo?: string;
}

export interface FeedbackResult {
  success: boolean;
  error?: string;
}

/**
 * Submit user feedback to the database
 */
export async function submitFeedback(submission: FeedbackSubmission): Promise<FeedbackResult> {
  try {
    // Get the anonymous ID
    const anonymousId = await getAnonymousId();
    
    if (!anonymousId) {
      return {
        success: false,
        error: 'Unable to identify device. Please try again.',
      };
    }

    // Get app version info
    const appVersion = Constants.expoConfig?.version ?? null;
    const buildNumber = Platform.OS === 'ios' 
      ? Constants.expoConfig?.ios?.buildNumber ?? null
      : String(Constants.expoConfig?.android?.versionCode ?? '');

    // Insert feedback into database
    const { error } = await supabase
      .from('app_feedback')
      .insert({
        anonymous_id: anonymousId,
        feedback_text: submission.feedbackText.trim(),
        contact_info: submission.contactInfo?.trim() || null,
        app_version: appVersion,
        build_number: buildNumber,
        platform: Platform.OS as 'ios' | 'android',
      });

    if (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }

    console.log('[Feedback] Feedback submitted successfully');
    return { success: true };
  } catch (error) {
    console.error('[Feedback] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

