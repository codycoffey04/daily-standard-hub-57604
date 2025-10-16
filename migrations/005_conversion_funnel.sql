-- Create conversion funnel analysis function
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(
  from_date DATE,
  to_date DATE,
  producer_filter UUID DEFAULT NULL,
  source_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  stage_number INT,
  stage_name TEXT,
  stage_value BIGINT,
  conversion_rate NUMERIC,
  drop_off_count BIGINT,
  drop_off_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_dials BIGINT;
  total_conversations BIGINT;
  total_qhh BIGINT;
  total_hh_with_quotes BIGINT;
  total_sales BIGINT;
BEGIN
  -- Calculate stage 1: Outbound Dials
  SELECT COALESCE(SUM(e.outbound_dials), 0)
  INTO total_dials
  FROM public.daily_entries e
  WHERE e.entry_date BETWEEN from_date AND to_date
    AND (producer_filter IS NULL OR e.producer_id = producer_filter);

  -- Calculate stage 2: Conversations (entries with talk time)
  SELECT COUNT(DISTINCT e.id)
  INTO total_conversations
  FROM public.daily_entries e
  WHERE e.entry_date BETWEEN from_date AND to_date
    AND e.talk_minutes > 0
    AND (producer_filter IS NULL OR e.producer_id = producer_filter);

  -- Calculate stage 3: Quoted Households (QHH)
  SELECT COALESCE(SUM(CASE 
    WHEN source_filter IS NULL THEN e.qhh_total
    ELSE (SELECT COALESCE(SUM(des.qhh), 0) 
          FROM public.daily_entry_sources des 
          WHERE des.daily_entry_id = e.id 
            AND des.source_id = source_filter)
  END), 0)
  INTO total_qhh
  FROM public.daily_entries e
  WHERE e.entry_date BETWEEN from_date AND to_date
    AND (producer_filter IS NULL OR e.producer_id = producer_filter);

  -- Calculate stage 4: Households with Quotes
  SELECT COUNT(DISTINCT e.id)
  INTO total_hh_with_quotes
  FROM public.daily_entries e
  WHERE e.entry_date BETWEEN from_date AND to_date
    AND (producer_filter IS NULL OR e.producer_id = producer_filter)
    AND CASE 
      WHEN source_filter IS NULL THEN e.qhh_total > 0
      ELSE EXISTS (
        SELECT 1 FROM public.daily_entry_sources des 
        WHERE des.daily_entry_id = e.id 
          AND des.source_id = source_filter
          AND des.quotes > 0
      )
    END;

  -- Calculate stage 5: Sales Closed (items sold)
  SELECT COALESCE(SUM(CASE 
    WHEN source_filter IS NULL THEN e.items_total
    ELSE (SELECT COALESCE(SUM(des.items), 0) 
          FROM public.daily_entry_sources des 
          WHERE des.daily_entry_id = e.id 
            AND des.source_id = source_filter)
  END), 0)
  INTO total_sales
  FROM public.daily_entries e
  WHERE e.entry_date BETWEEN from_date AND to_date
    AND (producer_filter IS NULL OR e.producer_id = producer_filter);

  -- Return stage 1: Outbound Dials
  RETURN QUERY SELECT
    1::INT,
    'Outbound Dials'::TEXT,
    total_dials,
    100.0::NUMERIC,
    0::BIGINT,
    0.0::NUMERIC;

  -- Return stage 2: Conversations
  RETURN QUERY SELECT
    2::INT,
    'Conversations'::TEXT,
    total_conversations,
    CASE WHEN total_dials > 0 THEN ROUND((total_conversations::NUMERIC / total_dials) * 100, 2) ELSE 0 END,
    (total_dials - total_conversations)::BIGINT,
    CASE WHEN total_dials > 0 THEN ROUND(((total_dials - total_conversations)::NUMERIC / total_dials) * 100, 2) ELSE 0 END;

  -- Return stage 3: Quoted Households
  RETURN QUERY SELECT
    3::INT,
    'Quoted Households'::TEXT,
    total_qhh,
    CASE WHEN total_conversations > 0 THEN ROUND((total_qhh::NUMERIC / total_conversations) * 100, 2) ELSE 0 END,
    (total_conversations - total_qhh)::BIGINT,
    CASE WHEN total_conversations > 0 THEN ROUND(((total_conversations - total_qhh)::NUMERIC / total_conversations) * 100, 2) ELSE 0 END;

  -- Return stage 4: HH with Quotes
  RETURN QUERY SELECT
    4::INT,
    'HH with Quotes'::TEXT,
    total_hh_with_quotes,
    CASE WHEN total_qhh > 0 THEN ROUND((total_hh_with_quotes::NUMERIC / total_qhh) * 100, 2) ELSE 0 END,
    (total_qhh - total_hh_with_quotes)::BIGINT,
    CASE WHEN total_qhh > 0 THEN ROUND(((total_qhh - total_hh_with_quotes)::NUMERIC / total_qhh) * 100, 2) ELSE 0 END;

  -- Return stage 5: Sales Closed
  RETURN QUERY SELECT
    5::INT,
    'Sales Closed'::TEXT,
    total_sales,
    CASE WHEN total_hh_with_quotes > 0 THEN ROUND((total_sales::NUMERIC / total_hh_with_quotes) * 100, 2) ELSE 0 END,
    (total_hh_with_quotes - total_sales)::BIGINT,
    CASE WHEN total_hh_with_quotes > 0 THEN ROUND(((total_hh_with_quotes - total_sales)::NUMERIC / total_hh_with_quotes) * 100, 2) ELSE 0 END;
END;
$$;
