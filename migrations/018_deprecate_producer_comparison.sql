-- Mark get_producer_comparison as deprecated
-- This function is being replaced by aggregating get_producer_trends results
-- Reason: get_producer_comparison doesn't include sales_from_old_quotes

COMMENT ON FUNCTION public.get_producer_comparison(date, date) IS 
'DEPRECATED: Use get_producer_trends and aggregate in TypeScript instead. 
This function is missing sales from sales_from_old_quotes table, causing incorrect sold_items and sold_premium totals.';
