-- Create gratitude_quotes table for daily quotes on the gratitude list page
CREATE TABLE gratitude_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_year INTEGER NOT NULL UNIQUE CHECK (day_of_year >= 1 AND day_of_year <= 366),
  quote TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gratitude_quotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required to read quotes)
CREATE POLICY "Allow public read access" ON gratitude_quotes
  FOR SELECT USING (true);

-- Index for fast lookup by day of year
CREATE INDEX idx_gratitude_quotes_day ON gratitude_quotes(day_of_year);

-- Add comment for documentation
COMMENT ON TABLE gratitude_quotes IS 'Daily quotes displayed on the gratitude list page, one for each day of the year (366 total)';
COMMENT ON COLUMN gratitude_quotes.day_of_year IS 'Day of year (1-366), used to display the appropriate quote for each calendar day';
COMMENT ON COLUMN gratitude_quotes.quote IS 'The quote text';
COMMENT ON COLUMN gratitude_quotes.source IS 'Attribution/source of the quote (displayed as "Quote — Source")';
