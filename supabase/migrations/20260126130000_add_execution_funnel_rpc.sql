-- Create get_execution_funnel RPC function
-- Returns aggregated funnel metrics for the Execution Funnel Dashboard and Pattern Insights

CREATE OR REPLACE FUNCTION get_execution_funnel(
  from_date date,
  to_date date,
  producer_filter uuid DEFAULT NULL,
  source_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  dials bigint,
  qhh bigint,
  households_sold bigint,
  items_sold bigint,
  policies_sold bigint,
  premium_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(de.outbound_dials), 0)::bigint AS dials,
    COALESCE(SUM(de.qhh_total), 0)::bigint AS qhh,
    COALESCE((
      SELECT COUNT(*)
      FROM quoted_households qh
      WHERE qh.daily_entry_id IN (
          SELECT id FROM daily_entries
          WHERE entry_date BETWEEN from_date AND to_date
            AND (producer_filter IS NULL OR producer_id = producer_filter)
        )
        AND qh.quick_action_status = 'SOLD'
        AND (source_filter IS NULL OR qh.lead_source_id = source_filter)
    ), 0)::bigint AS households_sold,
    COALESCE(SUM(de.items_total), 0)::bigint AS items_sold,
    COALESCE(SUM(de.sales_total), 0)::bigint AS policies_sold,
    COALESCE((
      SELECT SUM(pbe.total_premium)
      FROM premium_by_entry pbe
      WHERE pbe.daily_entry_id IN (
          SELECT id FROM daily_entries
          WHERE entry_date BETWEEN from_date AND to_date
            AND (producer_filter IS NULL OR producer_id = producer_filter)
        )
    ), 0)::numeric AS premium_total
  FROM daily_entries de
  WHERE de.entry_date BETWEEN from_date AND to_date
    AND (producer_filter IS NULL OR de.producer_id = producer_filter);
END;
$$;
