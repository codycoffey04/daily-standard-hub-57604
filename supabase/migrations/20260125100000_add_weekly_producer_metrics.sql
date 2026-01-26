-- Add weekly_producer_metrics column for separate weekly data
-- This allows storing MTD data for VC pacing and weekly data for WoW deltas separately

ALTER TABLE email_metrics
ADD COLUMN IF NOT EXISTS weekly_producer_metrics JSONB DEFAULT '{}'::jsonb;

-- Add weekly team totals
ALTER TABLE email_metrics
ADD COLUMN IF NOT EXISTS weekly_team_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_team_premium NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_team_sales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_team_policies INTEGER DEFAULT 0;

-- Add raw weekly paste for reference
ALTER TABLE email_metrics
ADD COLUMN IF NOT EXISTS raw_weekly_production_paste TEXT;

COMMENT ON COLUMN email_metrics.producer_metrics IS 'MTD (month-to-date) production metrics per producer - used for VC pacing';
COMMENT ON COLUMN email_metrics.weekly_producer_metrics IS 'Weekly production metrics per producer - used for WoW deltas';
COMMENT ON COLUMN email_metrics.weekly_team_items IS 'Weekly team items total for WoW delta calculation';
COMMENT ON COLUMN email_metrics.weekly_team_premium IS 'Weekly team premium total for WoW delta calculation';
COMMENT ON COLUMN email_metrics.weekly_team_sales IS 'Weekly team sales total for WoW delta calculation';
COMMENT ON COLUMN email_metrics.weekly_team_policies IS 'Weekly team policies total for WoW delta calculation';
