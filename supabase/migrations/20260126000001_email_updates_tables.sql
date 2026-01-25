-- Email Updates Feature Tables
-- Stores weekly/monthly production snapshots and generated emails

-- ============================================================================
-- EMAIL_METRICS: Weekly/monthly production snapshots
-- ============================================================================
CREATE TABLE public.email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period identification
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Raw pasted data (for audit/debugging)
  raw_production_paste TEXT,
  raw_lead_source_paste TEXT,

  -- Producer metrics from AgencyZoom (JSONB)
  -- Structure: { "maria": { "sales": 6, "items": 18, "premium": 11088, "policies": 8 }, ... }
  producer_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- TDS Activity metrics (auto-pulled from daily_entries + quoted_households)
  -- Structure: { "maria": { "qhh": 23, "quotes": 32, "dials": 450, "talk_minutes": 890 }, ... }
  tds_activity_metrics JSONB DEFAULT '{}'::jsonb,

  -- Team totals (denormalized for quick access)
  team_sales INTEGER DEFAULT 0,
  team_items INTEGER DEFAULT 0,
  team_premium NUMERIC(12,2) DEFAULT 0,
  team_policies INTEGER DEFAULT 0,
  team_qhh INTEGER DEFAULT 0,
  team_quotes INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one record per period
  UNIQUE(period_type, period_start)
);

-- Auto-update updated_at
CREATE TRIGGER trg_email_metrics_updated_at
  BEFORE UPDATE ON public.email_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- EMAIL_LEAD_SOURCE_METRICS: Lead source performance per period
-- ============================================================================
CREATE TABLE public.email_lead_source_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_metrics_id UUID NOT NULL REFERENCES public.email_metrics(id) ON DELETE CASCADE,

  -- Source identification
  source_name_raw TEXT NOT NULL,         -- Original name from AgencyZoom CSV
  mapped_source_name TEXT,               -- Normalized name after mapping (e.g., "Crystal (CSR)")
  tds_source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,  -- Optional link to TDS sources

  -- Metrics from AgencyZoom
  items INTEGER DEFAULT 0,
  premium NUMERIC(12,2) DEFAULT 0,
  policies INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,

  -- CSR attribution
  attributed_to TEXT,                    -- e.g., "Crystal", "Aleeah"
  is_csr_source BOOLEAN DEFAULT false,   -- True if this is a CSR referral source

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EMAIL_UPDATES: Generated email archive
-- ============================================================================
CREATE TABLE public.email_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_metrics_id UUID NOT NULL REFERENCES public.email_metrics(id) ON DELETE CASCADE,

  -- Email identification
  email_type TEXT NOT NULL CHECK (email_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Generated content
  subject_line TEXT NOT NULL,
  html_content TEXT NOT NULL,
  markdown_content TEXT NOT NULL,

  -- Additional context provided by user
  announcements TEXT,

  -- Comparison data for WoW/MoM
  previous_period_id UUID REFERENCES public.email_metrics(id) ON DELETE SET NULL,
  comparison_data JSONB,
  /* Structure:
  {
    "team_items_delta": 5,
    "team_items_pct_change": 12.5,
    "team_premium_delta": 2100,
    "team_premium_pct_change": 11.8,
    "producer_deltas": {
      "maria": { "items_delta": 3, "items_pct": 20.0, "premium_delta": 1200 }
    }
  }
  */

  -- Generation metadata
  model_used TEXT,
  tokens_used INTEGER,
  generation_duration_ms INTEGER,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One email per type per period
  UNIQUE(email_type, period_start)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_email_metrics_period ON public.email_metrics(period_type, period_start DESC);
CREATE INDEX idx_email_metrics_created ON public.email_metrics(created_at DESC);

CREATE INDEX idx_email_lead_source_metrics_email ON public.email_lead_source_metrics(email_metrics_id);
CREATE INDEX idx_email_lead_source_metrics_csr ON public.email_lead_source_metrics(is_csr_source) WHERE is_csr_source = true;

CREATE INDEX idx_email_updates_type_period ON public.email_updates(email_type, period_start DESC);
CREATE INDEX idx_email_updates_metrics ON public.email_updates(email_metrics_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lead_source_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_updates ENABLE ROW LEVEL SECURITY;

-- email_metrics policies (Owner/Manager only)
CREATE POLICY "Owner/Manager can view email_metrics"
ON public.email_metrics FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can insert email_metrics"
ON public.email_metrics FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can update email_metrics"
ON public.email_metrics FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can delete email_metrics"
ON public.email_metrics FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

-- email_lead_source_metrics policies (inherit from email_metrics)
CREATE POLICY "Owner/Manager can view email_lead_source_metrics"
ON public.email_lead_source_metrics FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.email_metrics em
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE em.id = email_lead_source_metrics.email_metrics_id
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can manage email_lead_source_metrics"
ON public.email_lead_source_metrics FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

-- email_updates policies (Owner/Manager only)
CREATE POLICY "Owner/Manager can view email_updates"
ON public.email_updates FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can manage email_updates"
ON public.email_updates FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.email_metrics IS 'Stores weekly/monthly production snapshots from AgencyZoom + TDS activity data';
COMMENT ON TABLE public.email_lead_source_metrics IS 'Stores lead source performance metrics per period, with CSR attribution';
COMMENT ON TABLE public.email_updates IS 'Archive of generated weekly/monthly team emails';

COMMENT ON COLUMN public.email_metrics.producer_metrics IS 'JSONB: { producerKey: { sales, items, premium, policies } }';
COMMENT ON COLUMN public.email_metrics.tds_activity_metrics IS 'JSONB: { producerKey: { qhh, quotes, dials, talk_minutes } }';
COMMENT ON COLUMN public.email_lead_source_metrics.source_name_raw IS 'Original source name from AgencyZoom CSV before mapping';
COMMENT ON COLUMN public.email_lead_source_metrics.mapped_source_name IS 'Display name after applying source_mappings config';
COMMENT ON COLUMN public.email_updates.comparison_data IS 'WoW/MoM delta calculations for the email';
