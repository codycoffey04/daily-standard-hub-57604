-- =============================================
-- Sales Coaching Feature - Database Schema
-- =============================================

-- 1. Framework Configuration Table
-- Stores scorecard criteria, cross-sell triggers, focus rotation, episode templates
CREATE TABLE public.coaching_framework_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL CHECK (config_type IN ('scorecard', 'cross_sell_triggers', 'focus_rotation', 'episode_template', 'producer_profiles')),
  config_data JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Coaching Metrics Table
-- Stores weekly metrics from AgencyZoom paste
CREATE TABLE public.coaching_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Raw pasted data (for reference/debugging)
  raw_paste TEXT,

  -- Parsed per-producer metrics as JSONB
  producer_metrics JSONB NOT NULL,
  /* Structure:
  {
    "maria": { "qhh": 23, "quotes": 32, "sales": 2, "items": 8, "premium": 4217.69, "close_rate": 8.7 },
    "kimberly": { "qhh": 18, "quotes": 27, "sales": 0, "items": 0, "premium": 0, "close_rate": 0 }
  }
  */

  -- Team totals (denormalized for quick access)
  team_qhh INTEGER,
  team_quotes INTEGER,
  team_sales INTEGER,
  team_items INTEGER,
  team_premium NUMERIC(12,2),
  team_close_rate NUMERIC(5,2),

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(week_start)
);

-- 3. Coaching Episodes Table
-- Stores generated coaching episodes per producer per week
CREATE TABLE public.coaching_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  metrics_id UUID REFERENCES public.coaching_metrics(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Episode content
  episode_title TEXT NOT NULL,
  episode_content TEXT NOT NULL,  -- Markdown for NotebookLM
  episode_summary TEXT,  -- Brief summary of key findings

  -- Focus theme from rotation
  focus_theme TEXT NOT NULL,
  focus_week_number INTEGER CHECK (focus_week_number BETWEEN 1 AND 8),
  override_reason TEXT,  -- If theme was manually overridden

  -- Metrics snapshot at generation time
  qhh INTEGER DEFAULT 0,
  quotes INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  items INTEGER DEFAULT 0,
  premium NUMERIC(12,2) DEFAULT 0,
  close_rate NUMERIC(5,2) DEFAULT 0,

  -- Generation metadata
  model_used TEXT,
  tokens_used INTEGER,
  generation_duration_ms INTEGER,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('draft', 'generating', 'generation_failed', 'published', 'archived')) DEFAULT 'draft',
  error_message TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,

  UNIQUE(producer_id, week_start)
);

-- 4. Coaching Transcripts Table
-- Stores uploaded PDF transcripts
CREATE TABLE public.coaching_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public.coaching_episodes(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,

  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- Supabase Storage path
  file_size INTEGER NOT NULL,

  -- Extraction
  extracted_text TEXT,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  extraction_error TEXT,

  -- Call metadata (from PDF)
  call_date DATE,
  call_duration_seconds INTEGER,
  call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
  customer_phone TEXT,

  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Coaching Scores Table
-- Stores 8-step scorecard results per transcript
CREATE TABLE public.coaching_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.coaching_transcripts(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.coaching_episodes(id) ON DELETE CASCADE,

  -- 8-step scorecard (0-2 scale: 0=Missed, 1=Partial, 2=Strong)
  step_1_opening INTEGER CHECK (step_1_opening BETWEEN 0 AND 2),
  step_2_discovery INTEGER CHECK (step_2_discovery BETWEEN 0 AND 2),
  step_3_quoting INTEGER CHECK (step_3_quoting BETWEEN 0 AND 2),
  step_4_ask_for_sale INTEGER CHECK (step_4_ask_for_sale BETWEEN 0 AND 2),
  step_5_closing INTEGER CHECK (step_5_closing BETWEEN 0 AND 2),
  step_6_follow_up INTEGER CHECK (step_6_follow_up BETWEEN 0 AND 2),
  step_7_multi_line INTEGER CHECK (step_7_multi_line BETWEEN 0 AND 2),
  step_8_referral_ask INTEGER CHECK (step_8_referral_ask BETWEEN 0 AND 2),

  -- Calculated overall (out of 16 max)
  overall_score NUMERIC(4,2),

  -- Call classification
  call_outcome TEXT CHECK (call_outcome IN ('sale', 'quote', 'service', 'unknown')),

  -- AI-generated analysis (stored as JSONB for flexibility)
  cross_sell_triggers_detected JSONB,  -- Array of {trigger, context, pursued: boolean}
  strengths JSONB,  -- Array of {category, quote, timestamp}
  improvement_areas JSONB,  -- Array of {category, quote, suggestion}
  specific_feedback TEXT,

  scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX idx_coaching_framework_config_type ON public.coaching_framework_config(config_type) WHERE active = true;

CREATE INDEX idx_coaching_metrics_week ON public.coaching_metrics(week_start DESC);

CREATE INDEX idx_coaching_episodes_producer ON public.coaching_episodes(producer_id);
CREATE INDEX idx_coaching_episodes_week ON public.coaching_episodes(week_start DESC);
CREATE INDEX idx_coaching_episodes_status ON public.coaching_episodes(status);

CREATE INDEX idx_coaching_transcripts_episode ON public.coaching_transcripts(episode_id);
CREATE INDEX idx_coaching_transcripts_producer_week ON public.coaching_transcripts(producer_id, week_start);
CREATE INDEX idx_coaching_transcripts_status ON public.coaching_transcripts(extraction_status);

CREATE INDEX idx_coaching_scores_transcript ON public.coaching_scores(transcript_id);
CREATE INDEX idx_coaching_scores_episode ON public.coaching_scores(episode_id);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE public.coaching_framework_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_scores ENABLE ROW LEVEL SECURITY;

-- Framework Config: Owner/Manager can manage
CREATE POLICY "Owner/Manager can view coaching framework config"
ON public.coaching_framework_config FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Owner/Manager can manage coaching framework config"
ON public.coaching_framework_config FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Metrics: Owner/Manager can manage
CREATE POLICY "Owner/Manager can view coaching metrics"
ON public.coaching_metrics FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Owner/Manager can manage coaching metrics"
ON public.coaching_metrics FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Episodes: Owner/Manager can manage
CREATE POLICY "Owner/Manager can view coaching episodes"
ON public.coaching_episodes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Owner/Manager can manage coaching episodes"
ON public.coaching_episodes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Transcripts: Owner/Manager can manage
CREATE POLICY "Owner/Manager can view coaching transcripts"
ON public.coaching_transcripts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Owner/Manager can manage coaching transcripts"
ON public.coaching_transcripts FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Scores: Owner/Manager can manage
CREATE POLICY "Owner/Manager can view coaching scores"
ON public.coaching_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Owner/Manager can manage coaching scores"
ON public.coaching_scores FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- =============================================
-- Helper Functions
-- =============================================

-- Function to calculate focus week number from a date
CREATE OR REPLACE FUNCTION get_focus_week_number(target_date DATE, cycle_start_date DATE DEFAULT '2026-01-06'::DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  weeks_since_start INTEGER;
BEGIN
  weeks_since_start := FLOOR((target_date - cycle_start_date) / 7);
  RETURN ((weeks_since_start % 8) + 1);
END;
$$;

-- Function to get Monday of a given date's week
CREATE OR REPLACE FUNCTION get_week_start(target_date DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Get Monday (start of week)
  RETURN target_date - EXTRACT(ISODOW FROM target_date)::INTEGER + 1;
END;
$$;

-- Function to get Sunday of a given date's week
CREATE OR REPLACE FUNCTION get_week_end(target_date DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Get Sunday (end of week)
  RETURN target_date + (7 - EXTRACT(ISODOW FROM target_date)::INTEGER);
END;
$$;
