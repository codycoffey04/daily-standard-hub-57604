create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  role text not null check (role in ('owner','manager','producer')),
  producer_id uuid null,
  created_at timestamptz not null default now()
);

create table if not exists public.producers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers(id) on delete cascade,
  entry_date date not null,
  entry_month date not null default date_trunc('month', now())::date,
  outbound_dials int not null default 0 check (outbound_dials >= 0),
  talk_minutes int not null default 0 check (talk_minutes >= 0),
  qhh_total int not null default 0 check (qhh_total >= 0),
  items_total int not null default 0 check (items_total >= 0),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_after timestamptz not null,
  unique (producer_id, entry_date)
);

create table if not exists public.daily_entry_sources (
  id uuid primary key default gen_random_uuid(),
  daily_entry_id uuid not null references public.daily_entries(id) on delete cascade,
  source_id uuid not null references public.sources(id),
  qhh int not null default 0 check (qhh >= 0),
  quotes int not null default 0 check (quotes >= 0),
  items int not null default 0 check (items >= 0),
  unique (daily_entry_id, source_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  daily_entry_id uuid not null references public.daily_entries(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  status text not null check (status in ('approved','flagged')),
  notes text null,
  attachments jsonb[] not null default '{}',
  has_issues boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid null references auth.users(id),
  action text not null check (action in ('insert','update','delete')),
  entity text not null,
  entity_id uuid null,
  diff jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.holidays (
  id date primary key,
  name text not null
);
insert into public.holidays (id, name) values
('2025-01-01','New Year''s Day'),
('2025-01-20','Martin Luther King Jr. Day'),
('2025-02-17','Washington''s Birthday'),
('2025-05-26','Memorial Day'),
('2025-06-19','Juneteenth National Independence Day'),
('2025-07-04','Independence Day'),
('2025-09-01','Labor Day'),
('2025-10-13','Columbus Day'),
('2025-11-11','Veterans Day'),
('2025-11-27','Thanksgiving Day'),
('2025-12-25','Christmas Day')
on conflict (id) do nothing;

create or replace function public.ct_today_date() returns date language sql stable as
$$ select (now() at time zone 'America/Chicago')::date; $$;

create or replace function public.ct_yesterday_date() returns date language sql stable as
$$ select (now() at time zone 'America/Chicago' - interval '1 day')::date; $$;

create or replace function public.is_business_day(d date) returns boolean language sql stable as
$$ select extract(isodow from d) < 6 and not exists (select 1 from public.holidays h where h.id = d); $$;

create or replace function public.working_days_in_month(d date) returns int language sql stable as
$$ with days as (
  select generate_series(date_trunc('month', d)::date,(date_trunc('month', d)+interval '1 month - 1 day')::date, interval '1 day') dt
) select count(*) from days where public.is_business_day(dt); $$;

create or replace function public.elapsed_working_days_in_month(d date) returns int language sql stable as
$$ with days as (select generate_series(date_trunc('month', d)::date, d, interval '1 day') dt)
select count(*) from days where public.is_business_day(dt); $$;

create or replace function public.is_owner_manager() returns boolean language sql stable as
$$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','manager')); $$;

create or replace function public.current_producer_id() returns uuid language sql stable as
$$ select p.producer_id from public.profiles p where p.id = auth.uid(); $$;

create or replace function public.jsonb_diff(a jsonb, b jsonb) returns jsonb language sql immutable as
$$ select coalesce(jsonb_object_agg(k, jsonb_build_object('old', a->k, 'new', b->k)), '{}')
from (select key as k from jsonb_each(a) union select key as k from jsonb_each(b)) s
where coalesce(a->k, 'null'::jsonb) is distinct from coalesce(b->k, 'null'::jsonb); $$;

create or replace function public.trg_set_entry_fields() returns trigger language plpgsql as
$$
declare ct date;
begin
  new.entry_month := date_trunc('month', new.entry_date)::date;
  new.locked_after := make_timestamptz(extract(year from new.entry_date)::int, extract(month from new.entry_date)::int, extract(day from new.entry_date)::int, 18, 0, 0, 'America/Chicago');
  if tg_op='INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  else
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  ct := (now() at time zone 'America/Chicago')::date;
  if new.entry_date > ct then raise exception 'entry_date cannot be in the future (CT)'; end if;
  return new;
end; $$;
drop trigger if exists trg_set_entry_fields on public.daily_entries;
create trigger trg_set_entry_fields before insert or update of entry_date on public.daily_entries for each row execute function public.trg_set_entry_fields();

create or replace function public.trg_sync_aggregates() returns trigger language plpgsql as
$$
declare s_qhh int; s_items int; v_id uuid;
begin
  v_id := coalesce(new.daily_entry_id, old.daily_entry_id);
  select coalesce(sum(qhh),0), coalesce(sum(items),0) into s_qhh, s_items from public.daily_entry_sources where daily_entry_id = v_id;
  update public.daily_entries set qhh_total = s_qhh, updated_at = now() where id = v_id;
  perform 1 from public.daily_entries e where e.id = v_id and e.items_total = s_items;
  if not found then raise exception 'items_total must equal sum(items by source)'; end if;
  return null;
end; $$;
drop trigger if exists trg_sync_aggregates on public.daily_entry_sources;
create trigger trg_sync_aggregates after insert or update or delete on public.daily_entry_sources for each row execute function public.trg_sync_aggregates();

create or replace function public.trg_validate_items_total_deferred() returns trigger language plpgsql as
$$
declare s int;
begin
  select coalesce(sum(items),0) into s from public.daily_entry_sources where daily_entry_id = new.id;
  if new.items_total <> s then raise exception 'items_total must equal sum(items by source)'; end if;
  return new;
end; $$;
drop trigger if exists trg_validate_items_total_deferred on public.daily_entries;
create constraint trigger trg_validate_items_total_deferred after insert or update on public.daily_entries deferrable initially deferred for each row execute function public.trg_validate_items_total_deferred();

create or replace view public.entry_status as
select e.id as entry_id, e.producer_id, e.entry_date,
  (e.outbound_dials >= 100) as met_dials,
  (e.talk_minutes >= 180) as met_talk,
  (e.qhh_total >= 4) as met_qhh,
  (e.items_total >= 2) as met_items,
  ((case when e.outbound_dials >= 100 then 1 else 0 end) +
   (case when e.talk_minutes >= 180 then 1 else 0 end) +
   (case when e.qhh_total >= 4 then 1 else 0 end) +
   (case when e.items_total >= 2 then 1 else 0 end)) as met_count,
  case
    when ((case when e.outbound_dials >= 100 then 1 else 0 end) +
          (case when e.talk_minutes >= 180 then 1 else 0 end) +
          (case when e.qhh_total >= 4 then 1 else 0 end) +
          (case when e.items_total >= 2 then 1 else 0 end)) >= 2
         and ((e.qhh_total >= 4) or (e.items_total >= 2)) then 'Top'
    when ((case when e.outbound_dials >= 100 then 1 else 0 end) +
          (case when e.talk_minutes >= 180 then 1 else 0 end) +
          (case when e.qhh_total >= 4 then 1 else 0 end) +
          (case when e.items_total >= 2 then 1 else 0 end)) = 2
         and (e.outbound_dials >= 100) and (e.talk_minutes >= 180)
         and not ((e.qhh_total >= 4) or (e.items_total >= 2)) then 'Bottom'
    else 'Outside'
  end as framework_status
from public.daily_entries e;

create or replace view public.yesterday_status as
select * from public.entry_status where entry_date = public.ct_yesterday_date();

create or replace function public.mtd_producer_metrics(d date default null)
returns table (producer_id uuid, producer_name text, qhh integer, quotes integer, items integer, conversion numeric, vc_pace numeric, vc_badge text, yesterday_status text)
language plpgsql stable as
$$
declare ref date; totalwd int; elapsedwd int;
begin
  ref := coalesce(d, public.ct_today_date());
  totalwd := public.working_days_in_month(ref);
  elapsedwd := public.elapsed_working_days_in_month(ref);
  return query
    with m as (
      select e.producer_id, sum(e.qhh_total) qhh, sum(e.items_total) items
      from public.daily_entries e
      where e.entry_month = date_trunc('month', ref)::date and e.entry_date <= ref
      group by e.producer_id
    ),
    q as (
      select e.producer_id, coalesce(sum(des.quotes),0) quotes
      from public.daily_entries e
      join public.daily_entry_sources des on des.daily_entry_id = e.id
      where e.entry_month = date_trunc('month', ref)::date and e.entry_date <= ref
      group by e.producer_id
    ),
    ys as (select producer_id, framework_status from public.yesterday_status)
    select
      p.id, p.display_name,
      coalesce(m.qhh,0),
      coalesce(q.quotes,0),
      coalesce(m.items,0),
      case when coalesce(m.qhh,0)=0 then 0 else round((coalesce(m.items,0)::numeric / m.qhh::numeric)*100,2) end,
      case when elapsedwd=0 then 0 else round((coalesce(m.items,0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric))*100,2) end,
      case
        when elapsedwd=0 then 'Red'
        when (coalesce(m.items,0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric))*100 >= 100 then 'Green'
        when (coalesce(m.items,0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric))*100 >= 90 then 'Amber'
        else 'Red'
      end,
      ys.framework_status
    from public.producers p
    left join m on m.producer_id = p.id
    left join q on q.producer_id = p.id
    left join ys on ys.producer_id = p.id
    where p.active = true;
end; $$;

create or replace function public.save_daily_entry(
  p_producer_email text, p_entry_date date, p_outbound_dials int, p_talk_minutes int, p_items_total int, p_by_source jsonb
) returns uuid language plpgsql security definer as
$$
declare v_producer uuid; v_entry uuid; s record; v_slug text; v_qhh int; v_quotes int; v_items int;
begin
  if not public.is_owner_manager() then raise exception 'Only owner/manager can import'; end if;
  select id into v_producer from public.producers where lower(email)=lower(p_producer_email) and active = true;
  if v_producer is null then raise exception 'Unknown producer %', p_producer_email; end if;

  insert into public.daily_entries (producer_id, entry_date, outbound_dials, talk_minutes, items_total, qhh_total)
  values (v_producer, p_entry_date, greatest(0,p_outbound_dials), greatest(0,p_talk_minutes), greatest(0,p_items_total), 0)
  returning id into v_entry;

  for s in select id, name from public.sources where active = true order by sort_order loop
    v_slug := lower(regexp_replace(s.name, '[^a-z0-9]+','_','g'));
    v_qhh := coalesce((p_by_source -> v_slug ->> 'qhh')::int, 0);
    v_quotes := coalesce((p_by_source -> v_slug ->> 'quotes')::int, 0);
    v_items := coalesce((p_by_source -> v_slug ->> 'items')::int, 0);
    insert into public.daily_entry_sources(daily_entry_id, source_id, qhh, quotes, items)
    values (v_entry, s.id, greatest(0,v_qhh), greatest(0,v_quotes), greatest(0,v_items));
  end loop;

  return v_entry;
end; $$;

insert into storage.buckets (id, name, public) values ('reviews','reviews', true) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.producers enable row level security;
alter table public.sources enable row level security;
alter table public.daily_entries enable row level security;
alter table public.daily_entry_sources enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists p_profiles_owner on public.profiles;
create policy p_profiles_owner on public.profiles for select using (id = auth.uid() or public.is_owner_manager());

drop policy if exists p_producers_ro on public.producers;
create policy p_producers_ro on public.producers for select using (public.is_owner_manager() or id = (select producer_id from public.profiles where id = auth.uid()));
drop policy if exists p_producers_admin on public.producers;
create policy p_producers_admin on public.producers for all using (public.is_owner_manager()) with check (public.is_owner_manager());

drop policy if exists p_sources_ro on public.sources;
create policy p_sources_ro on public.sources for select using (true);
drop policy if exists p_sources_admin on public.sources;
create policy p_sources_admin on public.sources for all using (public.is_owner_manager()) with check (public.is_owner_manager());

drop policy if exists p_entries_select on public.daily_entries;
create policy p_entries_select on public.daily_entries for select using (public.is_owner_manager() or producer_id = public.current_producer_id());

drop policy if exists p_entries_insert on public.daily_entries;
create policy p_entries_insert on public.daily_entries for insert with check (public.is_owner_manager() or producer_id = public.current_producer_id());

drop policy if exists p_entries_update on public.daily_entries;
create policy p_entries_update on public.daily_entries
for update using (public.is_owner_manager() or (producer_id = public.current_producer_id() and now() < locked_after))
with check (public.is_owner_manager() or (producer_id = public.current_producer_id() and now() < locked_after));

drop policy if exists p_entries_delete on public.daily_entries;
create policy p_entries_delete on public.daily_entries for delete using (public.is_owner_manager());

drop policy if exists p_des_select on public.daily_entry_sources;
create policy p_des_select on public.daily_entry_sources
for select using (public.is_owner_manager() or exists (select 1 from public.daily_entries e where e.id = daily_entry_id and e.producer_id = public.current_producer_id()));

drop policy if exists p_des_cud on public.daily_entry_sources;
create policy p_des_cud on public.daily_entry_sources
for all using (public.is_owner_manager() or exists (select 1 from public.daily_entries e where e.id = daily_entry_id and e.producer_id = public.current_producer_id() and now() < e.locked_after))
with check (public.is_owner_manager() or exists (select 1 from public.daily_entries e where e.id = daily_entry_id and e.producer_id = public.current_producer_id() and now() < e.locked_after));

drop policy if exists p_reviews_select on public.reviews;
create policy p_reviews_select on public.reviews
for select using (public.is_owner_manager() or exists (select 1 from public.daily_entries e where e.id = daily_entry_id and e.producer_id = public.current_producer_id()));
drop policy if exists p_reviews_admin on public.reviews;
create policy p_reviews_admin on public.reviews
for all using (public.is_owner_manager()) with check (public.is_owner_manager());

drop policy if exists p_audit_admin on public.audit_log;
create policy p_audit_admin on public.audit_log for select using (public.is_owner_manager());

create policy if not exists "reviews public read" on storage.objects for select using (bucket_id = 'reviews');
create policy if not exists "reviews admin write" on storage.objects for insert to authenticated with check (bucket_id = 'reviews' and public.is_owner_manager());

insert into public.sources (name, active, sort_order) values
('Digital Marketing', true, 10),('Net Lead', true, 20),('Direct Mail', true, 30),('Call-In', true, 40),
('Walk-In', true, 50),('Cross-Sell', true, 60),('Referral', true, 70),('Other', true, 80)
on conflict (name) do update set active=excluded.active, sort_order=excluded.sort_order;

insert into public.producers (display_name, email, active) values
('Kimberly','kfletcher2@allstate.com', true),
('Maria','mrochaguzman@allstate.com', true),
('Brandy','bwilkins2@allstate.com', true),
('Caleb','calebfill@allstate.com', true)
on conflict (email) do update set display_name=excluded.display_name, active=excluded.active;