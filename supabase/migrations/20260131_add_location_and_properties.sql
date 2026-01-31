-- Migration: Add location and properties columns for enhanced event tracking
-- Date: 2026-01-31
-- 
-- This migration adds:
-- 1. JSONB properties column to usage_events for flexible event metadata
-- 2. Location columns (city, region, country) to usage_events for per-event geolocation
-- 3. Location columns to user_profiles for user demographics
-- 4. last_seen_at column to user_profiles

-- ============================================
-- 1. Add columns to usage_events
-- ============================================

ALTER TABLE public.usage_events 
ADD COLUMN IF NOT EXISTS properties jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS city text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country text DEFAULT NULL;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_usage_events_country ON public.usage_events(country);
CREATE INDEX IF NOT EXISTS idx_usage_events_region ON public.usage_events(region);

-- Add GIN index for JSONB properties queries
CREATE INDEX IF NOT EXISTS idx_usage_events_properties ON public.usage_events USING GIN (properties);

-- ============================================
-- 2. Add columns to user_profiles
-- ============================================

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS city text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT NULL;

-- Add index for location-based user queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country);

-- ============================================
-- 3. Comments for documentation
-- ============================================

COMMENT ON COLUMN public.usage_events.properties IS 'JSONB column for flexible event metadata (e.g., prayer_title, literature_id, sponsor_name)';
COMMENT ON COLUMN public.usage_events.city IS 'City derived from IP geolocation';
COMMENT ON COLUMN public.usage_events.region IS 'State/Region derived from IP geolocation';
COMMENT ON COLUMN public.usage_events.country IS 'Country code derived from IP geolocation (ISO 3166-1 alpha-2)';

COMMENT ON COLUMN public.user_profiles.city IS 'Most recent city from IP geolocation';
COMMENT ON COLUMN public.user_profiles.region IS 'Most recent state/region from IP geolocation';
COMMENT ON COLUMN public.user_profiles.country IS 'Most recent country from IP geolocation';
COMMENT ON COLUMN public.user_profiles.last_seen_at IS 'Timestamp of most recent event from this user';
