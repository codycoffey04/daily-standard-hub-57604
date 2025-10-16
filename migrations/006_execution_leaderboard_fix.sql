-- Fix execution leaderboard column mapping and guidance logic
-- This corrects two issues:
-- 1. Returns total_dials and total_qhh (not dials/qhh) to match frontend interface
-- 2. Treats zero benchmarks as insufficient data (adds > 0 checks)

CREATE OR REPLACE FUNCTION get_producer_execution_leaderboard(
  from_date date,
  to_date date,
  source_filter text DEFAULT NULL,
  min_dials integer DEFAULT 200,
  min_qhh integer DEFAULT 30,
  min_shh integer DEFAULT 10,
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
      pr.name as producer_name,
      COALESCE(SUM(des.dials), 0) as total_dials,
      COALESCE(SUM(des.qhh), 0) as total_qhh,
      COALESCE(SUM(de.shh), 0) as total_shh,
      COALESCE(SUM(de.items), 0) as total_items,
      COALESCE(SUM(de.premium), 0) as total_premium,
      -- Calculate rates
      CASE 
        WHEN COALESCE(SUM(des.dials), 0) > 0 
        THEN (COALESCE(SUM(des.qhh), 0)::numeric / SUM(des.dials)::numeric * 100)
        ELSE 0 
      END as quote_rate,
      CASE 
        WHEN COALESCE(SUM(des.qhh), 0) > 0 
        THEN (COALESCE(SUM(de.shh), 0)::numeric / SUM(des.qhh)::numeric * 100)
        ELSE 0 
      END as close_rate,
      CASE 
        WHEN COALESCE(SUM(de.shh), 0) > 0 
        THEN (COALESCE(SUM(de.items), 0)::numeric / SUM(de.shh)::numeric)
        ELSE 0 
      END as attach_rate
    FROM daily_entries de
    INNER JOIN profiles pr ON de.producer_id = pr.id
    LEFT JOIN daily_entry_sources des ON de.id = des.daily_entry_id
    WHERE de.entry_date BETWEEN from_date AND to_date
      AND (source_filter IS NULL OR des.source_id::text = source_filter)
    GROUP BY de.producer_id, pr.name
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
  LEFT JOIN benchmarks_data bd ON 1=1  -- Cross join since benchmarks are aggregated
  ORDER BY pm.total_premium DESC;
END;
$$;
