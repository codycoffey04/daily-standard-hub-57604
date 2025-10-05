-- Add items_sold column to quoted_households table
ALTER TABLE public.quoted_households 
ADD COLUMN items_sold INTEGER DEFAULT 1 CHECK (items_sold >= 1 AND items_sold <= 10);