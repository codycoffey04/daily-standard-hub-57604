-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'producer')),
  producer_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create producers table
CREATE TABLE public.producers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sources table
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_entries table
CREATE TABLE public.daily_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  entry_month TEXT NOT NULL,
  outbound_dials INTEGER NOT NULL DEFAULT 0,
  talk_minutes INTEGER NOT NULL DEFAULT 0,
  qhh_total INTEGER NOT NULL DEFAULT 0,
  items_total INTEGER NOT NULL DEFAULT 0,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_entry_sources table
CREATE TABLE public.daily_entry_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_entry_id UUID NOT NULL,
  source_id UUID NOT NULL,
  qhh INTEGER NOT NULL DEFAULT 0,
  quotes INTEGER NOT NULL DEFAULT 0,
  items INTEGER NOT NULL DEFAULT 0
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_entry_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'flagged')),
  notes TEXT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_issues BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id);
ALTER TABLE public.daily_entries ADD CONSTRAINT daily_entries_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id);
ALTER TABLE public.daily_entry_sources ADD CONSTRAINT daily_entry_sources_daily_entry_id_fkey FOREIGN KEY (daily_entry_id) REFERENCES public.daily_entries(id);
ALTER TABLE public.daily_entry_sources ADD CONSTRAINT daily_entry_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_daily_entry_id_fkey FOREIGN KEY (daily_entry_id) REFERENCES public.daily_entries(id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entry_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view producers" ON public.producers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner/Manager can manage producers" ON public.producers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Authenticated users can view sources" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner/Manager can manage sources" ON public.sources FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Users can view related daily entries" ON public.daily_entries FOR SELECT TO authenticated USING (
  auth.uid() = producer_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Users can manage their own daily entries" ON public.daily_entries FOR ALL TO authenticated USING (
  auth.uid() = producer_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

CREATE POLICY "Users can view related daily entry sources" ON public.daily_entry_sources FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.daily_entries de WHERE de.id = daily_entry_id AND (
    de.producer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  ))
);

CREATE POLICY "Users can manage related daily entry sources" ON public.daily_entry_sources FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.daily_entries de WHERE de.id = daily_entry_id AND (
    de.producer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  ))
);

CREATE POLICY "Users can view related reviews" ON public.reviews FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.daily_entries de WHERE de.id = daily_entry_id AND (
    de.producer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  ))
);

CREATE POLICY "Owner/Manager can manage reviews" ON public.reviews FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Create views
CREATE VIEW public.entry_status AS
SELECT 
  de.id as entry_id,
  de.producer_id,
  de.entry_date,
  (de.outbound_dials >= 75) as met_dials,
  (de.talk_minutes >= 120) as met_talk,
  (de.qhh_total >= 8) as met_qhh,
  (de.items_total >= 4) as met_items,
  (CASE 
    WHEN de.outbound_dials >= 75 THEN 1 ELSE 0 END +
   CASE 
    WHEN de.talk_minutes >= 120 THEN 1 ELSE 0 END +
   CASE 
    WHEN de.qhh_total >= 8 THEN 1 ELSE 0 END +
   CASE 
    WHEN de.items_total >= 4 THEN 1 ELSE 0 END) as met_count,
  CASE 
    WHEN (de.outbound_dials >= 75 AND de.talk_minutes >= 120 AND de.qhh_total >= 8 AND de.items_total >= 4) THEN 'Top'
    WHEN (de.outbound_dials >= 75 OR de.talk_minutes >= 120 OR de.qhh_total >= 8 OR de.items_total >= 4) THEN 'Bottom'
    ELSE 'Outside'
  END as framework_status
FROM public.daily_entries de;

CREATE VIEW public.yesterday_status AS
SELECT * FROM public.entry_status 
WHERE entry_date = CURRENT_DATE - INTERVAL '1 day';

-- Create function for MTD producer metrics
CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  qhh INTEGER,
  quotes INTEGER,
  items INTEGER,
  conversion NUMERIC,
  vc_pace NUMERIC,
  vc_badge TEXT,
  yesterday_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as producer_id,
    p.display_name as producer_name,
    COALESCE(SUM(des.qhh), 0)::INTEGER as qhh,
    COALESCE(SUM(des.quotes), 0)::INTEGER as quotes,
    COALESCE(SUM(des.items), 0)::INTEGER as items,
    CASE 
      WHEN COALESCE(SUM(des.qhh), 0) = 0 THEN 0
      ELSE ROUND(COALESCE(SUM(des.quotes), 0)::NUMERIC / COALESCE(SUM(des.qhh), 1), 2)
    END as conversion,
    CASE 
      WHEN COALESCE(SUM(des.items), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(des.items), 0) * 30 / EXTRACT(DAY FROM d))::NUMERIC, 1)
    END as vc_pace,
    CASE 
      WHEN (COALESCE(SUM(des.items), 0) * 30 / EXTRACT(DAY FROM d)) >= 12 THEN 'Green'
      WHEN (COALESCE(SUM(des.items), 0) * 30 / EXTRACT(DAY FROM d)) >= 8 THEN 'Amber'
      ELSE 'Red'
    END as vc_badge,
    COALESCE(ys.framework_status, 'Outside') as yesterday_status
  FROM public.producers p
  LEFT JOIN public.daily_entries de ON p.id = de.producer_id 
    AND de.entry_date >= DATE_TRUNC('month', d)
    AND de.entry_date <= d
  LEFT JOIN public.daily_entry_sources des ON de.id = des.daily_entry_id
  LEFT JOIN public.yesterday_status ys ON p.id = ys.producer_id
  WHERE p.active = true
  GROUP BY p.id, p.display_name, ys.framework_status
  ORDER BY vc_pace DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for saving daily entries
CREATE OR REPLACE FUNCTION public.save_daily_entry(
  p_producer_email TEXT,
  p_entry_date DATE,
  p_outbound_dials INTEGER,
  p_talk_minutes INTEGER,
  p_items_total INTEGER,
  p_by_source JSONB
)
RETURNS UUID AS $$
DECLARE
  v_producer_id UUID;
  v_entry_id UUID;
  v_source JSONB;
BEGIN
  -- Get producer ID from email
  SELECT id INTO v_producer_id 
  FROM public.producers 
  WHERE email = p_producer_email;
  
  IF v_producer_id IS NULL THEN
    RAISE EXCEPTION 'Producer not found with email: %', p_producer_email;
  END IF;
  
  -- Insert or update daily entry
  INSERT INTO public.daily_entries (
    producer_id, 
    entry_date, 
    entry_month,
    outbound_dials, 
    talk_minutes, 
    items_total,
    qhh_total
  ) VALUES (
    v_producer_id,
    p_entry_date,
    TO_CHAR(p_entry_date, 'YYYY-MM'),
    p_outbound_dials,
    p_talk_minutes,
    p_items_total,
    (SELECT COALESCE(SUM((value->>'qhh')::INTEGER), 0) FROM jsonb_array_elements(p_by_source))
  )
  ON CONFLICT (producer_id, entry_date) 
  DO UPDATE SET
    outbound_dials = EXCLUDED.outbound_dials,
    talk_minutes = EXCLUDED.talk_minutes,
    items_total = EXCLUDED.items_total,
    qhh_total = EXCLUDED.qhh_total,
    updated_at = now()
  RETURNING id INTO v_entry_id;
  
  -- Delete existing sources for this entry
  DELETE FROM public.daily_entry_sources WHERE daily_entry_id = v_entry_id;
  
  -- Insert source data
  FOR v_source IN SELECT * FROM jsonb_array_elements(p_by_source)
  LOOP
    INSERT INTO public.daily_entry_sources (
      daily_entry_id,
      source_id,
      qhh,
      quotes,
      items
    ) VALUES (
      v_entry_id,
      (v_source->>'source_id')::UUID,
      (v_source->>'qhh')::INTEGER,
      (v_source->>'quotes')::INTEGER,
      (v_source->>'items')::INTEGER
    );
  END LOOP;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create unique constraints
ALTER TABLE public.daily_entries ADD CONSTRAINT daily_entries_producer_date_unique UNIQUE (producer_id, entry_date);