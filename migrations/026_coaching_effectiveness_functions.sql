-- Coaching Effectiveness Dashboard Functions
-- Idempotent: CREATE OR REPLACE allows safe re-runs

-- Function 1: Get overall coaching effectiveness metrics
CREATE OR REPLACE FUNCTION get_coaching_effectiveness_overall(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_reviews BIGINT,
  avg_gaps_per_review NUMERIC,
  resolution_rate NUMERIC,
  avg_days_to_resolve NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH review_data AS (
    SELECT 
      ar.id,
      ar.review_date,
      ar.resolved_date,
      COALESCE(array_length(ar.sales_process_gaps, 1), 0) as gap_count,
      CASE 
        WHEN ar.resolved_date IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ar.resolved_date - ar.review_date)) / 86400
        ELSE NULL
      END as days_to_resolve
    FROM accountability_reviews ar
    WHERE ar.review_date >= p_start_date
      AND ar.review_date <= p_end_date
  )
  SELECT 
    COUNT(*)::BIGINT as total_reviews,
    ROUND(AVG(gap_count), 2) as avg_gaps_per_review,
    ROUND(
      (COUNT(*) FILTER (WHERE days_to_resolve IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as resolution_rate,
    ROUND(AVG(days_to_resolve), 1) as avg_days_to_resolve
  FROM review_data;
END;
$$;

-- Function 2: Get coaching effectiveness by producer
CREATE OR REPLACE FUNCTION get_coaching_effectiveness_by_producer(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  total_reviews BIGINT,
  total_gaps BIGINT,
  resolved_gaps BIGINT,
  avg_days_to_resolve NUMERIC,
  trend TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH producer_reviews AS (
    SELECT 
      ar.producer_id,
      p.display_name as producer_name,
      ar.review_date,
      ar.resolved_date,
      COALESCE(array_length(ar.sales_process_gaps, 1), 0) as gap_count,
      CASE 
        WHEN ar.resolved_date IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ar.resolved_date - ar.review_date)) / 86400
        ELSE NULL
      END as days_to_resolve
    FROM accountability_reviews ar
    LEFT JOIN profiles p ON p.producer_id = ar.producer_id
    WHERE ar.review_date >= p_start_date
      AND ar.review_date <= p_end_date
  ),
  recent_vs_old AS (
    SELECT 
      producer_id,
      AVG(gap_count) FILTER (WHERE review_date >= p_end_date - INTERVAL '14 days') as recent_avg,
      AVG(gap_count) FILTER (WHERE review_date < p_end_date - INTERVAL '14 days') as older_avg
    FROM producer_reviews
    GROUP BY producer_id
  )
  SELECT 
    pr.producer_id,
    pr.producer_name,
    COUNT(*)::BIGINT as total_reviews,
    SUM(pr.gap_count)::BIGINT as total_gaps,
    COUNT(*) FILTER (WHERE pr.days_to_resolve IS NOT NULL)::BIGINT as resolved_gaps,
    ROUND(AVG(pr.days_to_resolve), 1) as avg_days_to_resolve,
    CASE
      WHEN rvo.recent_avg < rvo.older_avg * 0.9 THEN 'improving'
      WHEN rvo.recent_avg > rvo.older_avg * 1.1 THEN 'declining'
      ELSE 'stable'
    END as trend
  FROM producer_reviews pr
  LEFT JOIN recent_vs_old rvo ON rvo.producer_id = pr.producer_id
  GROUP BY pr.producer_id, pr.producer_name, rvo.recent_avg, rvo.older_avg
  ORDER BY total_reviews DESC;
END;
$$;

-- Function 3: Get gap analysis by category
CREATE OR REPLACE FUNCTION get_coaching_gap_analysis(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category TEXT,
  total_occurrences BIGINT,
  resolved_count BIGINT,
  avg_time_to_resolve NUMERIC,
  affected_producers BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH gap_data AS (
    SELECT 
      unnest(ar.sales_process_gaps) as gap,
      ar.producer_id,
      ar.resolved_date,
      ar.review_date,
      CASE 
        WHEN ar.resolved_date IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (ar.resolved_date - ar.review_date)) / 86400
        ELSE NULL
      END as days_to_resolve
    FROM accountability_reviews ar
    WHERE ar.review_date >= p_start_date
      AND ar.review_date <= p_end_date
      AND ar.sales_process_gaps IS NOT NULL
      AND array_length(ar.sales_process_gaps, 1) > 0
  )
  SELECT 
    gd.gap as category,
    COUNT(*)::BIGINT as total_occurrences,
    COUNT(*) FILTER (WHERE gd.days_to_resolve IS NOT NULL)::BIGINT as resolved_count,
    ROUND(AVG(gd.days_to_resolve), 1) as avg_time_to_resolve,
    COUNT(DISTINCT gd.producer_id)::BIGINT as affected_producers
  FROM gap_data gd
  GROUP BY gd.gap
  ORDER BY total_occurrences DESC;
END;
$$;

-- Function 4: Get weekly coaching trends
CREATE OR REPLACE FUNCTION get_coaching_weekly_trends(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  week_start DATE,
  reviews_count BIGINT,
  gaps_identified BIGINT,
  gaps_resolved BIGINT,
  resolution_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_data AS (
    SELECT 
      date_trunc('week', ar.review_date)::DATE as week_start,
      ar.id,
      COALESCE(array_length(ar.sales_process_gaps, 1), 0) as gap_count,
      CASE WHEN ar.resolved_date IS NOT NULL THEN 1 ELSE 0 END as is_resolved
    FROM accountability_reviews ar
    WHERE ar.review_date >= p_start_date
      AND ar.review_date <= p_end_date
  )
  SELECT 
    wd.week_start,
    COUNT(DISTINCT wd.id)::BIGINT as reviews_count,
    SUM(wd.gap_count)::BIGINT as gaps_identified,
    SUM(wd.gap_count * wd.is_resolved)::BIGINT as gaps_resolved,
    ROUND(
      (SUM(wd.gap_count * wd.is_resolved)::NUMERIC / 
       NULLIF(SUM(wd.gap_count), 0)) * 100, 
      2
    ) as resolution_rate
  FROM weekly_data wd
  GROUP BY wd.week_start
  ORDER BY wd.week_start;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_coaching_effectiveness_overall TO authenticated;
GRANT EXECUTE ON FUNCTION get_coaching_effectiveness_by_producer TO authenticated;
GRANT EXECUTE ON FUNCTION get_coaching_gap_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_coaching_weekly_trends TO authenticated;
