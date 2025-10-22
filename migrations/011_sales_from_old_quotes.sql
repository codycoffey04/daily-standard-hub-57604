-- Create table to track sales from old quotes that closed today
create table if not exists public.sales_from_old_quotes (
  id uuid primary key default gen_random_uuid(),
  daily_entry_id uuid not null references public.daily_entries(id) on delete cascade,
  lead_source_id uuid not null references public.sources(id),
  items_sold int not null check (items_sold >= 1),
  premium numeric(10,2) not null check (premium > 0),
  notes text null,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index idx_sales_from_old_quotes_daily_entry on public.sales_from_old_quotes(daily_entry_id);
create index idx_sales_from_old_quotes_source on public.sales_from_old_quotes(lead_source_id);

-- Enable RLS
alter table public.sales_from_old_quotes enable row level security;

-- RLS Policies
create policy "Users can view sales from old quotes for their role"
  on public.sales_from_old_quotes for select
  using (
    public.is_owner_manager()
    or exists (
      select 1 from public.daily_entries de
      where de.id = daily_entry_id
      and de.producer_id = public.current_producer_id()
    )
  );

create policy "Users can insert sales from old quotes for their entries"
  on public.sales_from_old_quotes for insert
  with check (
    exists (
      select 1 from public.daily_entries de
      where de.id = daily_entry_id
      and (
        public.is_owner_manager()
        or de.producer_id = public.current_producer_id()
      )
    )
  );

create policy "Users can update sales from old quotes for their entries"
  on public.sales_from_old_quotes for update
  using (
    exists (
      select 1 from public.daily_entries de
      where de.id = daily_entry_id
      and (
        public.is_owner_manager()
        or de.producer_id = public.current_producer_id()
      )
      and now() < de.locked_after
    )
  );

create policy "Users can delete sales from old quotes for their entries"
  on public.sales_from_old_quotes for delete
  using (
    exists (
      select 1 from public.daily_entries de
      where de.id = daily_entry_id
      and (
        public.is_owner_manager()
        or de.producer_id = public.current_producer_id()
      )
      and now() < de.locked_after
    )
  );

-- Update trigger for updated_at
create or replace function public.trg_update_sales_from_old_quotes_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_update_sales_from_old_quotes_updated_at
  before update on public.sales_from_old_quotes
  for each row execute function public.trg_update_sales_from_old_quotes_timestamp();
