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
        };
        Insert: {
          anonymous_id: string;
          sobriety_date?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          anonymous_id?: string;
          sobriety_date?: string | null;
          timezone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
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
    };
  };
};