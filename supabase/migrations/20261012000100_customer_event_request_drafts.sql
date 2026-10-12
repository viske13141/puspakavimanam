create table if not exists public.customer_event_request_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  draft_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_event_request_drafts_customer_updated_idx
  on public.customer_event_request_drafts (customer_id, updated_at desc);

alter table public.customer_event_request_drafts enable row level security;
grant select, insert, update, delete on public.customer_event_request_drafts to authenticated;

drop policy if exists customer_event_drafts_select_own
  on public.customer_event_request_drafts;
create policy customer_event_drafts_select_own
  on public.customer_event_request_drafts
  for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists customer_event_drafts_insert_own
  on public.customer_event_request_drafts;
create policy customer_event_drafts_insert_own
  on public.customer_event_request_drafts
  for insert to authenticated
  with check (customer_id = auth.uid() and public.is_role('CUSTOMER'));

drop policy if exists customer_event_drafts_update_own
  on public.customer_event_request_drafts;
create policy customer_event_drafts_update_own
  on public.customer_event_request_drafts
  for update to authenticated
  using (customer_id = auth.uid() and public.is_role('CUSTOMER'))
  with check (customer_id = auth.uid() and public.is_role('CUSTOMER'));

drop policy if exists customer_event_drafts_delete_own
  on public.customer_event_request_drafts;
create policy customer_event_drafts_delete_own
  on public.customer_event_request_drafts
  for delete to authenticated
  using (customer_id = auth.uid() and public.is_role('CUSTOMER'));
