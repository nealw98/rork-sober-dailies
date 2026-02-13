-- Create the speakers table for AA Speaker recordings
-- Run this in the Supabase SQL Editor, then import speakers_complete.csv via the dashboard

CREATE TABLE IF NOT EXISTS public.speakers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker text NOT NULL,
  hometown text NOT NULL,
  meeting text NOT NULL,
  date date,
  title text NOT NULL,
  subtitle text,
  sobriety_years text,
  core_themes text NOT NULL,
  audience text,
  explicit boolean DEFAULT false,
  substances text,
  youtube_id text NOT NULL,
  youtube_url text NOT NULL,
  quote text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (matches existing table patterns)
CREATE POLICY "Allow anonymous read access"
  ON public.speakers
  FOR SELECT
  USING (true);

-- Create index on date for sorting
CREATE INDEX idx_speakers_date ON public.speakers (date DESC NULLS LAST);
