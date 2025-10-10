-- Create trigger function to auto-calculate lines_quoted and is_bundle
CREATE OR REPLACE FUNCTION public.calculate_qhh_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate lines_quoted from product_lines array length
  NEW.lines_quoted := array_length(NEW.product_lines, 1);
  
  -- Auto-calculate is_bundle (true if 2+ product lines)
  NEW.is_bundle := (array_length(NEW.product_lines, 1) >= 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on quoted_households table
CREATE TRIGGER trg_calculate_qhh_fields
  BEFORE INSERT OR UPDATE ON public.quoted_households
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_qhh_derived_fields();