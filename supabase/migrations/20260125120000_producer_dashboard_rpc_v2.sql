-- Producer Dashboard RPC Function v2
-- Fixes: proper workday calculation, framework streak, close rate in standings

DROP FUNCTION IF EXISTS public.get_producer_dashboard(uuid, date);

CREATE OR REPLACE FUNCTION public.get_producer_dashboard(p_producer_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_month_start DATE;
  v_month_end DATE;
  v_items_mtd INTEGER;
  v_qhh_mtd INTEGER;
  v_sales_mtd INTEGER;
  v_premium_mtd NUMERIC;
  v_close_rate NUMERIC;
  v_total_entries INTEGER;
  v_top_entries INTEGER;
  v_framework_compliance_pct NUMERIC;
  v_personal_goal INTEGER := 50;
  v_agency_target INTEGER := 76;
  v_workdays_total INTEGER;
  v_workdays_elapsed INTEGER;
  v_workdays_remaining INTEGER;
  v_items_per_day_needed NUMERIC;
  v_on_pace BOOLEAN;
  v_agency_current INTEGER;
  v_agency_gap INTEGER;
  v_framework_streak INTEGER;
  v_recent_items_3d INTEGER;
  v_monthly_avg_items_per_day NUMERIC;
BEGIN
  -- Calculate month boundaries
  v_month_start := DATE_TRUNC('month', p_date)::DATE;
  v_month_end := (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE;

  -- ==================
  -- WORKDAY CALCULATION (actual business days, Mon-Fri)
  -- ==================

  -- Total workdays in month (Mon-Fri only)
  SELECT COUNT(*)::INTEGER INTO v_workdays_total
  FROM generate_series(v_month_start, v_month_end, '1 day'::interval) d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6); -- Exclude Sat(6) and Sun(0)

  -- Elapsed workdays (up to and including p_date)
  SELECT COUNT(*)::INTEGER INTO v_workdays_elapsed
  FROM generate_series(v_month_start, p_date, '1 day'::interval) d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);

  v_workdays_remaining := GREATEST(0, v_workdays_total - v_workdays_elapsed);

  -- ==================
  -- SCORECARD SECTION
  -- ==================

  -- Items MTD, QHH MTD, Sales MTD from daily_entries
  SELECT
    COALESCE(SUM(de.items_total), 0),
    COALESCE(SUM(de.qhh_total), 0),
    COALESCE(SUM(de.sales_total), 0)
  INTO v_items_mtd, v_qhh_mtd, v_sales_mtd
  FROM public.daily_entries de
  WHERE de.producer_id = p_producer_id
    AND de.entry_date >= v_month_start
    AND de.entry_date <= p_date;

  -- Premium MTD from premium_by_entry view
  SELECT COALESCE(SUM(pbe.total_premium), 0)
  INTO v_premium_mtd
  FROM public.premium_by_entry pbe
  WHERE pbe.producer_id = p_producer_id
    AND pbe.entry_month = TO_CHAR(v_month_start, 'YYYY-MM');

  -- Close rate: sales / qhh * 100
  v_close_rate := CASE
    WHEN v_qhh_mtd > 0 THEN ROUND((v_sales_mtd::NUMERIC / v_qhh_mtd) * 100, 1)
    ELSE 0
  END;

  -- Framework compliance from entry_status view (TOP or BOTTOM = in framework)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE framework_status IN ('Top', 'Bottom'))
  INTO v_total_entries, v_top_entries
  FROM public.entry_status es
  WHERE es.producer_id = p_producer_id
    AND es.entry_date >= v_month_start
    AND es.entry_date <= p_date;

  v_framework_compliance_pct := CASE
    WHEN v_total_entries > 0 THEN ROUND((v_top_entries::NUMERIC / v_total_entries) * 100, 1)
    ELSE 0
  END;

  -- ==================
  -- PACE TO GOAL
  -- ==================

  v_items_per_day_needed := CASE
    WHEN v_workdays_remaining > 0 THEN ROUND((v_personal_goal - v_items_mtd)::NUMERIC / v_workdays_remaining, 2)
    ELSE 0
  END;

  v_on_pace := CASE
    WHEN v_workdays_elapsed > 0 AND v_workdays_total > 0 THEN
      (v_items_mtd::NUMERIC / v_workdays_elapsed) >= (v_personal_goal::NUMERIC / v_workdays_total)
    ELSE FALSE
  END;

  -- ==================
  -- VC COUNTDOWN
  -- ==================

  -- Agency total items from all active producers
  SELECT COALESCE(SUM(de.items_total), 0)
  INTO v_agency_current
  FROM public.producers p
  INNER JOIN public.daily_entries de ON p.id = de.producer_id
    AND de.entry_date >= v_month_start
    AND de.entry_date <= p_date
  WHERE p.active = true;

  -- ==================
  -- FRAMEWORK STREAK (consecutive days in TOP or BOTTOM)
  -- ==================

  WITH ordered_entries AS (
    SELECT
      es.entry_date,
      es.framework_status,
      CASE WHEN es.framework_status IN ('Top', 'Bottom') THEN 1 ELSE 0 END as in_framework,
      ROW_NUMBER() OVER (ORDER BY es.entry_date DESC) as rn
    FROM public.entry_status es
    WHERE es.producer_id = p_producer_id
      AND es.entry_date >= v_month_start
      AND es.entry_date <= p_date
  ),
  streak_calc AS (
    SELECT
      entry_date,
      framework_status,
      in_framework,
      rn,
      SUM(CASE WHEN in_framework = 0 THEN 1 ELSE 0 END)
        OVER (ORDER BY rn) as break_group
    FROM ordered_entries
  )
  SELECT COUNT(*) INTO v_framework_streak
  FROM streak_calc
  WHERE break_group = 0 AND in_framework = 1;

  -- ==================
  -- HOT STREAK (items in last 3 calendar days)
  -- ==================

  SELECT COALESCE(SUM(de.items_total), 0)
  INTO v_recent_items_3d
  FROM public.daily_entries de
  WHERE de.producer_id = p_producer_id
    AND de.entry_date >= (p_date - INTERVAL '2 days')::DATE
    AND de.entry_date <= p_date;

  -- Monthly average items per day (for velocity comparison)
  v_monthly_avg_items_per_day := CASE
    WHEN v_workdays_elapsed > 0 THEN ROUND(v_items_mtd::NUMERIC / v_workdays_elapsed, 2)
    ELSE 0
  END;

  v_agency_gap := GREATEST(0, v_agency_target - v_agency_current);

  -- ==================
  -- BUILD RESULT JSON
  -- ==================

  SELECT json_build_object(
    'scorecard', json_build_object(
      'items_mtd', v_items_mtd,
      'premium_mtd', v_premium_mtd,
      'close_rate', v_close_rate,
      'framework_compliance_pct', v_framework_compliance_pct,
      'qhh_mtd', v_qhh_mtd,
      'sales_mtd', v_sales_mtd,
      'total_entries', v_total_entries,
      'top_entries', v_top_entries
    ),
    'team_standings', (
      SELECT json_build_object(
        'my_rank', COALESCE((
          SELECT rank FROM (
            SELECT
              p.id,
              RANK() OVER (ORDER BY COALESCE(SUM(de.items_total), 0) DESC) as rank
            FROM public.producers p
            LEFT JOIN public.daily_entries de ON p.id = de.producer_id
              AND de.entry_date >= v_month_start
              AND de.entry_date <= p_date
            WHERE p.active = true
            GROUP BY p.id
          ) ranked WHERE id = p_producer_id
        ), 0),
        'total_producers', (
          SELECT COUNT(*) FROM public.producers WHERE active = true
        ),
        'standings', (
          SELECT json_agg(row_data ORDER BY items DESC)
          FROM (
            SELECT
              p.id as producer_id,
              p.display_name as producer_name,
              COALESCE(SUM(de.items_total), 0) as items,
              COALESCE(SUM(de.qhh_total), 0) as qhh,
              COALESCE(SUM(de.sales_total), 0) as sales,
              CASE
                WHEN COALESCE(SUM(de.qhh_total), 0) > 0
                THEN ROUND((COALESCE(SUM(de.sales_total), 0)::NUMERIC / SUM(de.qhh_total)) * 100, 1)
                ELSE 0
              END as close_rate,
              RANK() OVER (ORDER BY COALESCE(SUM(de.items_total), 0) DESC) as rank,
              (p.id = p_producer_id) as is_me
            FROM public.producers p
            LEFT JOIN public.daily_entries de ON p.id = de.producer_id
              AND de.entry_date >= v_month_start
              AND de.entry_date <= p_date
            WHERE p.active = true
            GROUP BY p.id, p.display_name
          ) row_data
        )
      )
    ),
    'pace', json_build_object(
      'personal_goal', v_personal_goal,
      'current_items', v_items_mtd,
      'workdays_elapsed', v_workdays_elapsed,
      'workdays_remaining', v_workdays_remaining,
      'workdays_total', v_workdays_total,
      'items_per_day_needed', v_items_per_day_needed,
      'on_pace', v_on_pace
    ),
    'vc_countdown', json_build_object(
      'agency_target', v_agency_target,
      'agency_current', v_agency_current,
      'agency_gap', v_agency_gap,
      'days_remaining', v_workdays_remaining,
      'producer_contribution', v_items_mtd,
      'producer_contribution_pct', CASE
        WHEN v_agency_current > 0 THEN ROUND((v_items_mtd::NUMERIC / v_agency_current) * 100, 1)
        ELSE 0
      END
    ),
    'streaks', json_build_object(
      'framework_streak', v_framework_streak,
      'recent_items_3d', v_recent_items_3d,
      'avg_items_per_day', v_monthly_avg_items_per_day
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_producer_dashboard(uuid, date) TO authenticated;
