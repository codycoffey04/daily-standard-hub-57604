-- Drop and recreate entry_status view to include sales from old quotes
drop view if exists public.entry_status cascade;

create or replace view public.entry_status as
select 
  e.id as entry_id, 
  e.producer_id, 
  e.entry_date,
  (e.outbound_dials >= 100) as met_dials,
  (e.talk_minutes >= 180) as met_talk,
  (e.qhh_total >= 4) as met_qhh,
  -- IMPORTANT: calculated_items_total includes items from today's QHH entries PLUS items from old quote sales
  -- All reports must use this calculated value for consistency
  (
    e.items_total + coalesce(
      (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
      0
    )
  ) as calculated_items_total,
  ((e.items_total + coalesce(
      (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
      0
    )) >= 2) as met_items,
  -- met_count uses calculated items
  ((case when e.outbound_dials >= 100 then 1 else 0 end) +
   (case when e.talk_minutes >= 180 then 1 else 0 end) +
   (case when e.qhh_total >= 4 then 1 else 0 end) +
   (case when (e.items_total + coalesce(
      (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
      0
    )) >= 2 then 1 else 0 end)) as met_count,
  -- framework_status uses calculated items
  case
    when ((case when e.outbound_dials >= 100 then 1 else 0 end) +
          (case when e.talk_minutes >= 180 then 1 else 0 end) +
          (case when e.qhh_total >= 4 then 1 else 0 end) +
          (case when (e.items_total + coalesce(
            (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
            0
          )) >= 2 then 1 else 0 end)) >= 2
         and ((e.qhh_total >= 4) or ((e.items_total + coalesce(
            (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
            0
          )) >= 2)) then 'TOP'
    when ((case when e.outbound_dials >= 100 then 1 else 0 end) +
          (case when e.talk_minutes >= 180 then 1 else 0 end) +
          (case when e.qhh_total >= 4 then 1 else 0 end) +
          (case when (e.items_total + coalesce(
            (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
            0
          )) >= 2 then 1 else 0 end)) = 2
         and (e.outbound_dials >= 100) and (e.talk_minutes >= 180)
         and not ((e.qhh_total >= 4) or ((e.items_total + coalesce(
            (select sum(sfq.items_sold) from public.sales_from_old_quotes sfq where sfq.daily_entry_id = e.id),
            0
          )) >= 2)) then 'BOTTOM'
    else 'OUTSIDE'
  end as framework_status
from public.daily_entries e;

-- Recreate yesterday_status view
create or replace view public.yesterday_status as
select * from public.entry_status where entry_date = public.ct_yesterday_date();
