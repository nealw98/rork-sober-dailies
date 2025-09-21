import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging for environment variables
console.log('SUPA URL?', !!process.env.EXPO_PUBLIC_SUPABASE_URL, 'KEY?', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('SUPA URL from Constants?', !!Constants.expoConfig?.extra?.supabaseUrl, 'KEY from Constants?', !!Constants.expoConfig?.extra?.supabaseAnonKey);

// Safe no-op if keys are missing
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export default supabase;
