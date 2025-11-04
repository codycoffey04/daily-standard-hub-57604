-- Add updated_at column to accountability_reviews table
-- Idempotent: safe to run multiple times

-- Add updated_at column if it doesn't exist
ALTER TABLE accountability_reviews 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Create or replace function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_accountability_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_accountability_reviews_updated_at ON accountability_reviews;

CREATE TRIGGER trg_update_accountability_reviews_updated_at
  BEFORE UPDATE ON accountability_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_accountability_reviews_updated_at();
