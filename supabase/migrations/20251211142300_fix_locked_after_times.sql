-- Fix locked_after timestamps that were incorrectly set to creation time
-- instead of 6 PM CT on the entry date
UPDATE daily_entries
SET locked_after = make_timestamptz(
  extract(year from entry_date)::int, 
  extract(month from entry_date)::int, 
  extract(day from entry_date)::int, 
  18, 0, 0, 'America/Chicago'
)
WHERE locked_after != make_timestamptz(
  extract(year from entry_date)::int, 
  extract(month from entry_date)::int, 
  extract(day from entry_date)::int, 
  18, 0, 0, 'America/Chicago'
);
