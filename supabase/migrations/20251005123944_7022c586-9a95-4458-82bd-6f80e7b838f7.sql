-- Fix remaining security warnings

-- Drop the old save_daily_entry function without search_path
DROP FUNCTION IF EXISTS public.save_daily_entry(text, date, integer, integer, integer, jsonb);

-- Recreate it with proper search_path (7 parameter version is already good)
-- This ensures only the secure version with search_path exists