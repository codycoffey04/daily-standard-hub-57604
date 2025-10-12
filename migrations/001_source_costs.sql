-- Create source_costs table
create table if not exists public.source_costs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  month date not null, -- First day of month (YYYY-MM-01)
  cost numeric(10,2) not null check (cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (source_id, month)
);

-- Enable RLS
alter table public.source_costs enable row level security;

-- RLS Policies: Everyone can read, only owner/manager can modify
drop policy if exists p_source_costs_select on public.source_costs;
create policy p_source_costs_select on public.source_costs 
  for select using (true);

drop policy if exists p_source_costs_insert on public.source_costs;
create policy p_source_costs_insert on public.source_costs
  for insert with check (public.is_owner_manager());

drop policy if exists p_source_costs_update on public.source_costs;
create policy p_source_costs_update on public.source_costs
  for update using (public.is_owner_manager())
  with check (public.is_owner_manager());

drop policy if exists p_source_costs_delete on public.source_costs;
create policy p_source_costs_delete on public.source_costs
  for delete using (public.is_owner_manager());

-- Trigger to set created_by and updated_by
create or replace function public.trg_set_cost_audit_fields()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  else
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_cost_audit_fields on public.source_costs;
create trigger trg_set_cost_audit_fields 
  before insert or update on public.source_costs 
  for each row execute function public.trg_set_cost_audit_fields();

-- Index for fast lookups
create index if not exists idx_source_costs_source_month 
  on public.source_costs(source_id, month desc);
