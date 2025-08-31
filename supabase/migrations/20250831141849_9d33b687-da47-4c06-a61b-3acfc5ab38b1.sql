-- Replace current sources with 8 canonical sources
DELETE FROM public.daily_entry_sources;
DELETE FROM public.sources;

-- Insert 8 canonical sources in alphabetical order
INSERT INTO public.sources (id, name, sort_order, active, created_at) VALUES
  (gen_random_uuid(), 'Call-In - Existing', 1, true, now()),
  (gen_random_uuid(), 'Call-In - NEW', 2, true, now()),
  (gen_random_uuid(), 'Cross-Sell', 3, true, now()),
  (gen_random_uuid(), 'Digital Marketing', 4, true, now()),
  (gen_random_uuid(), 'Direct Mail', 5, true, now()),
  (gen_random_uuid(), 'Net Lead', 6, true, now()),
  (gen_random_uuid(), 'Other', 7, true, now()),
  (gen_random_uuid(), 'Referral', 8, true, now());