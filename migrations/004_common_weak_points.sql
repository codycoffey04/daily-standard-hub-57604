-- Create RPC function to get common weak points from manager reviews
create or replace function get_common_weak_points(
  from_date date,
  to_date date,
  producer_filter uuid default null
)
returns table (
  gap_name text,
  frequency bigint,
  affected_producers bigint,
  recent_count bigint,
  producer_names text
) 
language plpgsql
security definer
as $$
begin
  return query
  with gap_data as (
    select 
      unnest(mr.sales_process_gaps) as gap,
      mr.producer_id,
      mr.review_date,
      p.display_name as producer_name
    from manager_reviews mr
    left join profiles p on p.producer_id = mr.producer_id
    where mr.review_date >= from_date
      and mr.review_date <= to_date
      and (producer_filter is null or mr.producer_id = producer_filter)
      and mr.sales_process_gaps is not null
      and array_length(mr.sales_process_gaps, 1) > 0
  )
  select 
    gd.gap as gap_name,
    count(*)::bigint as frequency,
    count(distinct gd.producer_id)::bigint as affected_producers,
    count(*) filter (where gd.review_date >= to_date - interval '30 days')::bigint as recent_count,
    string_agg(distinct gd.producer_name, ', ' order by gd.producer_name) as producer_names
  from gap_data gd
  group by gd.gap
  order by frequency desc;
end;
$$;
