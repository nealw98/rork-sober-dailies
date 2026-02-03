import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uzfqabcjxjqufpipdcla.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZnFhYmNqeGpxdWZwaXBkY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTI4NDgsImV4cCI6MjA2ODc2ODg0OH0.kqPftTCAXLQNd0sdDpIC1TRMXjk315hn92BEW7TKXmU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      daily_reflections: {
        Row: {
          id: string;
          day_of_year: number;
          date_display: string;
          title: string;
          quote: string;
          source: string;
          reflection: string;
          thought: string;
          affirmation?: string;
          meditation?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          day_of_year: number;
          date_display: string;
          title: string;
          quote: string;
          source: string;
          reflection: string;
          thought: string;
          affirmation?: string;
          meditation?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day_of_year?: number;
          date_display?: string;
          title?: string;
          quote?: string;
          source?: string;
          reflection?: string;
          thought?: string;
          affirmation?: string;
          meditation?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          anonymous_id: string;
          sobriety_date: string | null;
          timezone: string | null;
          created_at: string | null;
          updated_at: string | null;
          is_grandfathered: boolean; // Computed column: true if created_at < Feb 4, 2026
          city: string | null;
          region: string | null;
          country: string | null;
          last_seen_at: string | null;
        };
        Insert: {
          anonymous_id: string;
          sobriety_date?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          last_seen_at?: string | null;
          // is_grandfathered is computed, not insertable
        };
        Update: {
          anonymous_id?: string;
          sobriety_date?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          last_seen_at?: string | null;
          // is_grandfathered is computed, not updatable
        };
      };
      usage_events: {
        Row: {
          id: string;
          ts: string;
          event: string;
          screen: string | null;
          feature: string | null;
          session_id: string;
          app_version: string | null;
          platform: string | null;
          day_utc: string | null; // Computed column
          anonymous_id: string | null;
          exclude_from_analytics: boolean;
          duration_seconds: number | null;
          properties: Record<string, any> | null;
          city: string | null;
          region: string | null;
          country: string | null;
        };
        Insert: {
          id?: string;
          ts?: string;
          event: string;
          screen?: string | null;
          feature?: string | null;
          session_id: string;
          app_version?: string | null;
          platform?: string | null;
          anonymous_id?: string | null;
          exclude_from_analytics?: boolean;
          duration_seconds?: number | null;
          properties?: Record<string, any> | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          // day_utc is computed, not insertable
        };
        Update: {
          id?: string;
          ts?: string;
          event?: string;
          screen?: string | null;
          feature?: string | null;
          session_id?: string;
          app_version?: string | null;
          platform?: string | null;
          anonymous_id?: string | null;
          exclude_from_analytics?: boolean;
          duration_seconds?: number | null;
          properties?: Record<string, any> | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          // day_utc is computed, not updatable
        };
      };
      app_feedback: {
        Row: {
          id: string;
          anonymous_id: string;
          feedback_text: string;
          contact_info: string | null;
          app_version: string | null;
          build_number: string | null;
          platform: 'ios' | 'android' | 'web' | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          anonymous_id: string;
          feedback_text: string;
          contact_info?: string | null;
          app_version?: string | null;
          build_number?: string | null;
          platform?: 'ios' | 'android' | 'web' | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          anonymous_id?: string;
          feedback_text?: string;
          contact_info?: string | null;
          app_version?: string | null;
          build_number?: string | null;
          platform?: 'ios' | 'android' | 'web' | null;
          created_at?: string | null;
        };
      };
      gratitude_quotes: {
        Row: {
          id: string;
          day_of_year: number;
          quote: string;
          source: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          day_of_year: number;
          quote: string;
          source?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          day_of_year?: number;
          quote?: string;
          source?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
};