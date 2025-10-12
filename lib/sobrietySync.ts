import { supabase } from './supabase';
import { usageLogger } from './usageLogger';

// Simple function to sync sobriety date to Supabase (optional - won't block app if it fails)
export async function syncSobrietyDate(sobrietyDate: string | null): Promise<void> {
  try {
    // Get anonymous ID
    const anonymousId = await usageLogger.getAnonymousId();
    if (!anonymousId) {
      console.warn('[SobrietySync] No anonymous ID available');
      return;
    }

    // Get timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver';

    console.log('[SobrietySync] Attempting to sync sobriety date:', { 
      anonymous_id: anonymousId, 
      sobriety_date: sobrietyDate,
      timezone 
    });

    // Upsert to user_profiles table
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        anonymous_id: anonymousId,
        sobriety_date: sobrietyDate,
        timezone: timezone,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'anonymous_id' 
      });

    if (error) {
      // Log error but don't throw - this is optional sync functionality
      console.warn('[SobrietySync] Sync failed (this is optional):', error.message);
      console.warn('[SobrietySync] App will continue to work normally without cloud sync');
    } else {
      console.log('[SobrietySync] Successfully synced to Supabase');
    }
  } catch (error) {
    // Log error but don't throw - this is optional sync functionality
    console.warn('[SobrietySync] Sync failed (this is optional):', error);
    console.warn('[SobrietySync] App will continue to work normally without cloud sync');
  }
}
