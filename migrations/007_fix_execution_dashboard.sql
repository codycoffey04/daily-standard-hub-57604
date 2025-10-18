-- Fix Execution Dashboard: Correct table joins and create missing functions
-- This fixes:
-- 1. Wrong join from profiles -> correct join to producers
-- 2. Calculate SHH from quoted_households where status = 'SOLD'
-- 3. Get dials from daily_entries.outbound_dials
-- 4. Get premium from quoted_households
-- 5. Creates missing functions for execution funnel, benchmarks, and efficiency

-- Drop existing function
DROP FUNCTION IF EXISTS get_producer_execution_leaderboard(date, date, text, integer, integer, integer, integer, integer, integer);

-- Recreate with correct logic
CREATE OR REPLACE FUNCTION get_producer_execution_leaderboard(
  from_date date,
  to_date date,
  source_filter text DEFAULT NULL,
  min_dials integer DEFAULT 50,
  min_qhh integer DEFAULT 10,
  min_shh integer DEFAULT 3,
  min_pair_qhh integer DEFAULT 30,
  min_pair_shh integer DEFAULT 10,
  min_pair_dials integer DEFAULT 200
)
RETURNS TABLE (
  producer_id uuid,
  producer_name text,
  total_dials bigint,
  total_qhh bigint,
  total_shh bigint,
  total_items bigint,
  total_premium numeric,
  quote_rate numeric,
  close_rate numeric,
  attach_rate numeric,
  quote_guidance text,
  close_guidance text,
  attach_guidance text,
  quote_bench_normal numeric,
  quote_bench_excellent numeric,
  close_bench_normal numeric,
  close_bench_excellent numeric,
  attach_bench_normal numeric,
  attach_bench_excellent numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH producer_metrics AS (
    SELECT 
      de.producer_id,
      pr.display_name as producer_name,
      COALESCE(SUM(de.outbound_dials), 0) as total_dials,
      COALESCE(SUM(des.qhh), 0) as total_qhh,
      COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) as total_shh,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0) as total_items,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.quoted_premium ELSE 0 END), 0) as total_premium,
      -- Calculate rates
      CASE 
        WHEN COALESCE(SUM(de.outbound_dials), 0) > 0 
        THEN (COALESCE(SUM(des.qhh), 0)::numeric / SUM(de.outbound_dials)::numeric * 100)
        ELSE 0 
      END as quote_rate,
      CASE 
        WHEN COALESCE(SUM(des.qhh), 0) > 0 
        THEN (COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END)::numeric / SUM(des.qhh)::numeric * 100)
        ELSE 0 
      END as close_rate,
      CASE 
        WHEN COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) > 0 
        THEN (COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0)::numeric / 
              COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END)::numeric)
        ELSE 0 
      END as attach_rate
    FROM daily_entries de
    INNER JOIN producers pr ON de.producer_id = pr.id
    LEFT JOIN daily_entry_sources des ON de.id = des.daily_entry_id
    LEFT JOIN quoted_households qh ON qh.daily_entry_id = de.id
    WHERE de.entry_date BETWEEN from_date AND to_date
      AND (source_filter IS NULL OR des.source_id::text = source_filter)
    GROUP BY de.producer_id, pr.display_name
  ),
  benchmarks_data AS (
    SELECT * FROM get_execution_benchmarks_by_source(
      from_date, 
      to_date, 
      source_filter,
      min_pair_qhh,
      min_pair_shh,
      min_pair_dials
    )
  )
  SELECT 
    pm.producer_id,
    pm.producer_name,
    pm.total_dials,
    pm.total_qhh,
    pm.total_shh,
    pm.total_items,
    pm.total_premium,
    pm.quote_rate,
    pm.close_rate,
    pm.attach_rate,
    -- Quote guidance with zero benchmark check
    CASE
      WHEN bd.quote_bench_excellent IS NOT NULL AND bd.quote_bench_excellent > 0 
           AND pm.quote_rate >= bd.quote_bench_excellent 
        THEN 'above_excellent'
      WHEN bd.quote_bench_normal IS NOT NULL AND bd.quote_bench_normal > 0 
           AND pm.quote_rate >= bd.quote_bench_normal 
        THEN 'normal_range'
      WHEN bd.quote_bench_normal IS NOT NULL AND bd.quote_bench_normal > 0 
           AND pm.quote_rate < bd.quote_bench_normal 
        THEN 'needs_attention'
      WHEN pm.total_qhh < min_qhh OR pm.total_dials < min_dials 
        THEN 'insufficient_volume'
      ELSE 'no_benchmark'
    END as quote_guidance,
    -- Close guidance with zero benchmark check
    CASE
      WHEN bd.close_bench_excellent IS NOT NULL AND bd.close_bench_excellent > 0 
           AND pm.close_rate >= bd.close_bench_excellent 
        THEN 'above_excellent'
      WHEN bd.close_bench_normal IS NOT NULL AND bd.close_bench_normal > 0 
           AND pm.close_rate >= bd.close_bench_normal 
        THEN 'normal_range'
      WHEN bd.close_bench_normal IS NOT NULL AND bd.close_bench_normal > 0 
           AND pm.close_rate < bd.close_bench_normal 
        THEN 'needs_attention'
      WHEN pm.total_qhh < min_qhh OR pm.total_shh < min_shh 
        THEN 'insufficient_volume'
      ELSE 'no_benchmark'
    END as close_guidance,
    -- Attach guidance with zero benchmark check
    CASE
      WHEN bd.attach_bench_excellent IS NOT NULL AND bd.attach_bench_excellent > 0 
           AND pm.attach_rate >= bd.attach_bench_excellent 
        THEN 'above_excellent'
      WHEN bd.attach_bench_normal IS NOT NULL AND bd.attach_bench_normal > 0 
           AND pm.attach_rate >= bd.attach_bench_normal 
        THEN 'normal_range'
      WHEN bd.attach_bench_normal IS NOT NULL AND bd.attach_bench_normal > 0 
           AND pm.attach_rate < bd.attach_bench_normal 
        THEN 'needs_attention'
      WHEN pm.total_shh < min_shh 
        THEN 'insufficient_volume'
      ELSE 'no_benchmark'
    END as attach_guidance,
    bd.quote_bench_normal,
    bd.quote_bench_excellent,
    bd.close_bench_normal,
    bd.close_bench_excellent,
    bd.attach_bench_normal,
    bd.attach_bench_excellent
  FROM producer_metrics pm
  LEFT JOIN benchmarks_data bd ON 1=1
  ORDER BY pm.total_premium DESC;
END;
$$;

-- Create execution funnel function
CREATE OR REPLACE FUNCTION get_execution_funnel(
  from_date date,
  to_date date,
  producer_filter uuid DEFAULT NULL,
  source_filter text DEFAULT NULL
)
RETURNS TABLE (
  stage text,
  value bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT 
      COALESCE(SUM(de.outbound_dials), 0) as dials,
      COALESCE(SUM(des.qhh), 0) as qhh,
      COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) as shh,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0) as policies,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.quoted_premium ELSE 0 END), 0) as premium
    FROM daily_entries de
    LEFT JOIN daily_entry_sources des ON de.id = des.daily_entry_id
    LEFT JOIN quoted_households qh ON qh.daily_entry_id = de.id
    WHERE de.entry_date BETWEEN from_date AND to_date
      AND (producer_filter IS NULL OR de.producer_id = producer_filter)
      AND (source_filter IS NULL OR des.source_id::text = source_filter)
  )
  SELECT 'Dials', fd.dials, 100.0
  FROM funnel_data fd
  UNION ALL
  SELECT 'QHH', fd.qhh, 
    CASE WHEN fd.dials > 0 THEN ROUND((fd.qhh::numeric / fd.dials::numeric * 100), 2) ELSE 0 END
  FROM funnel_data fd
  UNION ALL
  SELECT 'SHH', fd.shh,
    CASE WHEN fd.qhh > 0 THEN ROUND((fd.shh::numeric / fd.qhh::numeric * 100), 2) ELSE 0 END
  FROM funnel_data fd
  UNION ALL
  SELECT 'Policies', fd.policies,
    CASE WHEN fd.shh > 0 THEN ROUND((fd.policies::numeric / fd.shh::numeric * 100), 2) ELSE 0 END
  FROM funnel_data fd
  UNION ALL
  SELECT 'Premium', ROUND(fd.premium::numeric, 0)::bigint,
    CASE WHEN fd.policies > 0 THEN ROUND((fd.premium::numeric / fd.policies::numeric), 2) ELSE 0 END
  FROM funnel_data fd;
END;
$$;

-- Create execution benchmarks by source function
CREATE OR REPLACE FUNCTION get_execution_benchmarks_by_source(
  from_date date,
  to_date date,
  source_filter text DEFAULT NULL,
  min_pair_qhh integer DEFAULT 30,
  min_pair_shh integer DEFAULT 10,
  min_pair_dials integer DEFAULT 200
)
RETURNS TABLE (
  quote_bench_normal numeric,
  quote_bench_excellent numeric,
  close_bench_normal numeric,
  close_bench_excellent numeric,
  attach_bench_normal numeric,
  attach_bench_excellent numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH producer_source_metrics AS (
    SELECT 
      de.producer_id,
      des.source_id,
      COALESCE(SUM(de.outbound_dials), 0) as dials,
      COALESCE(SUM(des.qhh), 0) as qhh,
      COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) as shh,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0) as policies,
      CASE 
        WHEN COALESCE(SUM(de.outbound_dials), 0) > 0 
        THEN (COALESCE(SUM(des.qhh), 0)::numeric / SUM(de.outbound_dials)::numeric * 100)
        ELSE 0 
      END as quote_rate,
      CASE 
        WHEN COALESCE(SUM(des.qhh), 0) > 0 
        THEN (COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END)::numeric / SUM(des.qhh)::numeric * 100)
        ELSE 0 
      END as close_rate,
      CASE 
        WHEN COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) > 0 
        THEN (COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0)::numeric / 
              COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END)::numeric)
        ELSE 0 
      END as attach_rate
    FROM daily_entries de
    LEFT JOIN daily_entry_sources des ON de.id = des.daily_entry_id
    LEFT JOIN quoted_households qh ON qh.daily_entry_id = de.id
    WHERE de.entry_date BETWEEN from_date AND to_date
      AND (source_filter IS NULL OR des.source_id::text = source_filter)
    GROUP BY de.producer_id, des.source_id
    HAVING COALESCE(SUM(des.qhh), 0) >= min_pair_qhh
       AND COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) >= min_pair_shh
       AND COALESCE(SUM(de.outbound_dials), 0) >= min_pair_dials
  ),
  benchmarks AS (
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY quote_rate) as quote_bench_normal,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY quote_rate) as quote_bench_excellent,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY close_rate) as close_bench_normal,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY close_rate) as close_bench_excellent,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY attach_rate) as attach_bench_normal,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY attach_rate) as attach_bench_excellent
    FROM producer_source_metrics
  )
  SELECT 
    ROUND(b.quote_bench_normal, 2),
    ROUND(b.quote_bench_excellent, 2),
    ROUND(b.close_bench_normal, 2),
    ROUND(b.close_bench_excellent, 2),
    ROUND(b.attach_bench_normal, 2),
    ROUND(b.attach_bench_excellent, 2)
  FROM benchmarks b;
END;
$$;

-- Create execution efficiency metrics function
CREATE OR REPLACE FUNCTION get_execution_efficiency_metrics(
  from_date date,
  to_date date,
  producer_filter uuid DEFAULT NULL,
  source_filter text DEFAULT NULL,
  commission_pct numeric DEFAULT 0.20
)
RETURNS TABLE (
  total_dials bigint,
  total_talk_minutes bigint,
  total_qhh bigint,
  total_shh bigint,
  total_policies bigint,
  total_premium numeric,
  premium_per_dial numeric,
  premium_per_hour numeric,
  commission_per_dial numeric,
  policies_per_shh numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT 
      COALESCE(SUM(de.outbound_dials), 0) as dials,
      COALESCE(SUM(de.talk_minutes), 0) as talk_minutes,
      COALESCE(SUM(des.qhh), 0) as qhh,
      COUNT(DISTINCT CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.lead_id END) as shh,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0) as policies,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.quoted_premium ELSE 0 END), 0) as premium
    FROM daily_entries de
    LEFT JOIN daily_entry_sources des ON de.id = des.daily_entry_id
    LEFT JOIN quoted_households qh ON qh.daily_entry_id = de.id
    WHERE de.entry_date BETWEEN from_date AND to_date
      AND (producer_filter IS NULL OR de.producer_id = producer_filter)
      AND (source_filter IS NULL OR des.source_id::text = source_filter)
  )
  SELECT 
    m.dials,
    m.talk_minutes,
    m.qhh,
    m.shh,
    m.policies,
    ROUND(m.premium, 2),
    CASE WHEN m.dials > 0 THEN ROUND(m.premium / m.dials, 2) ELSE 0 END,
    CASE WHEN m.talk_minutes > 0 THEN ROUND(m.premium / (m.talk_minutes / 60.0), 2) ELSE 0 END,
    CASE WHEN m.dials > 0 THEN ROUND((m.premium * commission_pct) / m.dials, 2) ELSE 0 END,
    CASE WHEN m.shh > 0 THEN ROUND(m.policies::numeric / m.shh::numeric, 2) ELSE 0 END
  FROM metrics m;
END;
$$;
