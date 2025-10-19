-- Create get_monthly_summary function
CREATE OR REPLACE FUNCTION get_monthly_summary(
  from_date date,
  to_date date
)
RETURNS TABLE (
  month_date date,
  month_name text,
  total_qhh integer,
  total_quotes integer,
  total_dials integer,
  total_entries integer,
  total_items integer,
  total_talk_minutes integer,
  unique_producers integer,
  top_framework_entries integer,
  bottom_framework_entries integer,
  outside_framework_entries integer,
  framework_compliance_pct numeric,
  avg_qhh_per_producer numeric,
  avg_quotes_per_producer numeric,
  qhh_to_quote_conversion numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', de.entry_date)::date as month_date,
    TO_CHAR(DATE_TRUNC('month', de.entry_date), 'FMMonth YYYY') as month_name,
    
    -- Totals
    COALESCE(SUM(de.qhh_total), 0)::integer as total_qhh,
    COALESCE(SUM(de.qhh_total), 0)::integer as total_quotes,
    COALESCE(SUM(de.outbound_dials), 0)::integer as total_dials,
    COUNT(*)::integer as total_entries,
    COALESCE(SUM(de.items_total), 0)::integer as total_items,
    COALESCE(SUM(de.talk_minutes), 0)::integer as total_talk_minutes,
    COUNT(DISTINCT de.producer_id)::integer as unique_producers,
    
    -- Framework status counts
    COUNT(*) FILTER (WHERE de.framework_status = 'TOP')::integer as top_framework_entries,
    COUNT(*) FILTER (WHERE de.framework_status = 'BOTTOM')::integer as bottom_framework_entries,
    COUNT(*) FILTER (WHERE de.framework_status = 'OUTSIDE')::integer as outside_framework_entries,
    
    -- Framework compliance percentage (TOP entries / total entries * 100)
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE de.framework_status = 'TOP')::numeric / COUNT(*)::numeric) * 100, 
        1
      )
      ELSE 0 
    END as framework_compliance_pct,
    
    -- Averages per producer
    CASE 
      WHEN COUNT(DISTINCT de.producer_id) > 0 
      THEN ROUND(
        COALESCE(SUM(de.qhh_total), 0)::numeric / COUNT(DISTINCT de.producer_id)::numeric, 
        1
      )
      ELSE 0 
    END as avg_qhh_per_producer,
    
    CASE 
      WHEN COUNT(DISTINCT de.producer_id) > 0 
      THEN ROUND(
        COALESCE(SUM(de.qhh_total), 0)::numeric / COUNT(DISTINCT de.producer_id)::numeric, 
        1
      )
      ELSE 0 
    END as avg_quotes_per_producer,
    
    -- Conversion rate
    CASE 
      WHEN SUM(de.outbound_dials) > 0 
      THEN ROUND(
        (COALESCE(SUM(de.qhh_total), 0)::numeric / SUM(de.outbound_dials)::numeric) * 100, 
        2
      )
      ELSE 0 
    END as qhh_to_quote_conversion
    
  FROM daily_entries de
  WHERE de.entry_date >= from_date 
    AND de.entry_date <= to_date
  GROUP BY DATE_TRUNC('month', de.entry_date)
  ORDER BY DATE_TRUNC('month', de.entry_date);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_monthly_summary(date, date) TO authenticated;
