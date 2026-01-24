-- =============================================
-- Sales Coaching Feature - Storage Bucket
-- =============================================

-- Create the coaching-transcripts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coaching-transcripts',
  'coaching-transcripts',
  false,  -- Private bucket
  10485760,  -- 10MB max file size
  ARRAY['application/pdf']::text[]  -- PDF only
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for coaching-transcripts bucket

-- Policy: Owner/Manager can upload transcripts
CREATE POLICY "Owner/Manager can upload coaching transcripts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'coaching-transcripts'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'manager')
  )
);

-- Policy: Owner/Manager can view transcripts
CREATE POLICY "Owner/Manager can view coaching transcripts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'coaching-transcripts'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'manager')
  )
);

-- Policy: Owner/Manager can update transcripts
CREATE POLICY "Owner/Manager can update coaching transcripts"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'coaching-transcripts'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'manager')
  )
);

-- Policy: Owner/Manager can delete transcripts
CREATE POLICY "Owner/Manager can delete coaching transcripts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'coaching-transcripts'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'manager')
  )
);
