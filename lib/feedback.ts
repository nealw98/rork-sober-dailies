import { Platform, Dimensions, PixelRatio } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { getAnonymousId } from './anonymousId';

export interface FeedbackSubmission {
  feedbackText: string;
  contactInfo?: string;
}

export interface FeedbackResult {
  success: boolean;
  error?: string;
}

/**
 * Submit user feedback. Goes through the feedback-submit edge function, which
 * stores the row in app_feedback AND emails a copy to soberdailies@gmail.com.
 * If the function is unreachable, falls back to inserting the row directly so
 * feedback is never lost (no email in that case).
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

    // Device context for troubleshooting (same fields as Daily Paths).
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    const row = {
      anonymous_id: anonymousId,
      feedback_text: submission.feedbackText.trim(),
      contact_info: submission.contactInfo?.trim() || null,
      app_version: appVersion,
      build_number: buildNumber,
      platform: Platform.OS as 'ios' | 'android',
      device_model: Device.modelName ?? null,
      os_version: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`,
      screen_width: Math.round(screenWidth),
      screen_height: Math.round(screenHeight),
      font_scale: PixelRatio.getFontScale(),
      manufacturer: Platform.OS === 'android' ? (Device.manufacturer ?? null) : null,
    };

    const { data, error: fnError } = await supabase.functions.invoke('feedback-submit', {
      body: row,
    });

    if (!fnError && data?.success) {
      console.log('[Feedback] Feedback submitted successfully', data.emailed ? '(emailed)' : '(email skipped)');
      return { success: true };
    }

    console.warn('[Feedback] Edge function failed, falling back to direct insert:', fnError ?? data);
    const { error } = await supabase.from('app_feedback').insert(row);

    if (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }

    console.log('[Feedback] Feedback submitted successfully (direct insert)');
    return { success: true };
  } catch (error) {
    console.error('[Feedback] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

