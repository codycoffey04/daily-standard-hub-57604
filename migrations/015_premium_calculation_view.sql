-- Create a view that calculates total premium from both sources:
-- 1. quoted_households where quick_action_status = 'SOLD' (quoted_premium becomes sold premium)
-- 2. sales_from_old_quotes (premium from old quotes that closed)

CREATE OR REPLACE VIEW premium_by_entry AS
SELECT 
  de.id as daily_entry_id,
  de.producer_id,
  de.entry_date,
  de.entry_month,
  COALESCE(qh_premium.total, 0) + COALESCE(old_quotes_premium.total, 0) as total_premium
FROM daily_entries de
LEFT JOIN (
  SELECT 
    daily_entry_id,
    SUM(quoted_premium) as total
  FROM quoted_households
  WHERE quick_action_status = 'SOLD'
  GROUP BY daily_entry_id
) qh_premium ON qh_premium.daily_entry_id = de.id
LEFT JOIN (
  SELECT 
    daily_entry_id,
    SUM(premium) as total
  FROM sales_from_old_quotes
  GROUP BY daily_entry_id
) old_quotes_premium ON old_quotes_premium.daily_entry_id = de.id;

-- Add comment explaining the view
COMMENT ON VIEW premium_by_entry IS 
'Calculates total premium per daily entry from two sources: sold quotes (quoted_households with quick_action_status=SOLD) and old quote sales (sales_from_old_quotes)';
