-- Drop existing entry_status view and recreate with correct thresholds and framework status logic
DROP VIEW IF EXISTS public.entry_status CASCADE;

CREATE VIEW public.entry_status AS
SELECT 
  de.id as entry_id,
  de.producer_id,
  de.entry_date,
  de.outbound_dials,
  de.talk_minutes,
  de.qhh_total,
  de.items_total,
  de.created_at,
  de.updated_at,
  -- Boolean flags for each metric using CORRECT thresholds
  (de.outbound_dials >= 100) as met_dials,
  (de.talk_minutes >= 180) as met_talk,
  (de.qhh_total >= 4) as met_qhh,
  (de.items_total >= 2) as met_items,
  -- Count of metrics met
  (
    CASE WHEN de.outbound_dials >= 100 THEN 1 ELSE 0 END +
    CASE WHEN de.talk_minutes >= 180 THEN 1 ELSE 0 END +
    CASE WHEN de.qhh_total >= 4 THEN 1 ELSE 0 END +
    CASE WHEN de.items_total >= 2 THEN 1 ELSE 0 END
  ) as met_count,
  -- Framework status with CORRECT logic
  CASE
    -- TOP: 2+ metrics met AND at least 1 impact metric (QHH>=4 OR Items>=2)
    WHEN (
      CASE WHEN de.outbound_dials >= 100 THEN 1 ELSE 0 END +
      CASE WHEN de.talk_minutes >= 180 THEN 1 ELSE 0 END +
      CASE WHEN de.qhh_total >= 4 THEN 1 ELSE 0 END +
      CASE WHEN de.items_total >= 2 THEN 1 ELSE 0 END
    ) >= 2 AND (de.qhh_total >= 4 OR de.items_total >= 2) 
    THEN 'Top'
    -- BOTTOM: 2+ metrics met but only effort metrics (no impact)
    WHEN (
      CASE WHEN de.outbound_dials >= 100 THEN 1 ELSE 0 END +
      CASE WHEN de.talk_minutes >= 180 THEN 1 ELSE 0 END +
      CASE WHEN de.qhh_total >= 4 THEN 1 ELSE 0 END +
      CASE WHEN de.items_total >= 2 THEN 1 ELSE 0 END
    ) >= 2 AND de.qhh_total < 4 AND de.items_total < 2
    THEN 'Bottom'
    -- OUTSIDE: Less than 2 metrics met
    ELSE 'Outside'
  END as framework_status
FROM public.daily_entries de;