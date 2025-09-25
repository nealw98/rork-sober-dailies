import { supabase } from './supabase';
import { usageLogger } from './usageLogger';

// Simple function to sync sobriety date to Supabase
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

    console.log('[SobrietySync] Syncing sobriety date:', { 
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
      console.error('[SobrietySync] Failed to sync:', error);
    } else {
      console.log('[SobrietySync] Successfully synced to Supabase');
    }
  } catch (error) {
    console.error('[SobrietySync] Sync failed:', error);
  }
}
