create table if not exists public.passengers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  full_legal_name text not null check (length(trim(full_legal_name)) >= 2),
  date_of_birth date,
  nationality text not null check (length(trim(nationality)) >= 2),
  passenger_type text not null default 'ADULT' check (passenger_type in ('ADULT', 'CHILD', 'INFANT', 'UNACCOMPANIED_MINOR')),
  is_foreign_national boolean not null default false,
  visa_required boolean not null default false,
  medical_fitness_required boolean not null default false,
  contact_email text,
  contact_phone text,
  emergency_contact_name text not null check (length(trim(emergency_contact_name)) >= 2),
  emergency_contact_relationship text not null check (length(trim(emergency_contact_relationship)) >= 2),
  emergency_contact_phone text not null check (length(trim(emergency_contact_phone)) >= 5),
  next_of_kin_name text not null check (length(trim(next_of_kin_name)) >= 2),
  next_of_kin_relationship text not null check (length(trim(next_of_kin_relationship)) >= 2),
  next_of_kin_phone text not null check (length(trim(next_of_kin_phone)) >= 5),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REMOVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, request_id)
);

create table if not exists public.passenger_documents (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null,
  request_id uuid not null references public.requests(id) on delete cascade,
  document_type text not null check (document_type in ('GOVERNMENT_PHOTO_ID', 'PASSPORT', 'VISA', 'MEDICAL_FITNESS_CERTIFICATE', 'GUARDIAN_CONSENT', 'OTHER_SUPPORTING')),
  document_reference text,
  issuing_country text,
  issue_date date,
  expiry_date date,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  status text not null default 'UPLOADED' check (status in ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  rejection_reason text,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  supersedes_document_id uuid references public.passenger_documents(id),
  created_at timestamptz not null default now(),
  foreign key (passenger_id, request_id) references public.passengers(id, request_id) on delete cascade
);

create index if not exists passengers_request_id_idx on public.passengers(request_id);
create index if not exists passenger_documents_passenger_id_idx on public.passenger_documents(passenger_id);
create index if not exists passenger_documents_request_id_idx on public.passenger_documents(request_id);
create index if not exists passenger_documents_status_idx on public.passenger_documents(status);

alter table public.request_timeline add column if not exists actor_role public.app_role;
alter table public.request_timeline add column if not exists passenger_id uuid references public.passengers(id) on delete set null;
alter table public.request_timeline add column if not exists passenger_document_id uuid references public.passenger_documents(id) on delete set null;
alter table public.request_timeline add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.passengers enable row level security;
alter table public.passenger_documents enable row level security;

create or replace function public.can_access_passenger_request(target_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requests
    where id = target_request_id
      and (customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))
  );
$$;

create or replace function public.passenger_audit_event(
  target_request_id uuid,
  target_passenger_id uuid,
  target_document_id uuid,
  target_event_type text,
  target_message text,
  target_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.request_timeline (request_id, actor_id, actor_role, passenger_id, passenger_document_id, event_type, message, metadata)
  select target_request_id, auth.uid(), role, target_passenger_id, target_document_id, target_event_type, target_message, coalesce(target_metadata, '{}'::jsonb)
  from public.profiles
  where id = auth.uid();
end;
$$;

create or replace function public.audit_passenger_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.passenger_audit_event(
    new.request_id,
    new.id,
    null,
    case when tg_op = 'INSERT' then 'PASSENGER_CREATED' else 'PASSENGER_UPDATED' end,
    case when tg_op = 'INSERT' then 'Passenger created' else 'Passenger details updated' end,
    jsonb_build_object('passenger_type', new.passenger_type, 'is_foreign_national', new.is_foreign_national)
  );
  return new;
end;
$$;

drop trigger if exists passenger_audit_trigger on public.passengers;
create trigger passenger_audit_trigger after insert or update on public.passengers for each row execute function public.audit_passenger_change();

create or replace function public.audit_passenger_document_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare event_name text; event_message text;
begin
  if tg_op = 'INSERT' then
    event_name := 'DOCUMENT_UPLOADED';
    event_message := 'Passenger document uploaded';
  elsif new.status is distinct from old.status then
    event_name := case new.status when 'UNDER_REVIEW' then 'DOCUMENT_SUBMITTED_FOR_REVIEW' when 'VERIFIED' then 'DOCUMENT_VERIFIED' when 'REJECTED' then 'DOCUMENT_REJECTED' when 'EXPIRED' then 'DOCUMENT_EXPIRED' else 'DOCUMENT_STATUS_CHANGED' end;
    event_message := 'Passenger document status changed to ' || new.status;
  else
    event_name := 'DOCUMENT_REPLACED';
    event_message := 'Passenger document replaced';
  end if;
  perform public.passenger_audit_event(new.request_id, new.passenger_id, new.id, event_name, event_message, jsonb_build_object('document_type', new.document_type, 'status', new.status, 'rejection_reason', new.rejection_reason));
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.passenger_audit_event(new.request_id, new.passenger_id, new.id, 'PASSENGER_COMPLIANCE_STATUS_CHANGED', 'Passenger document status changed compliance state', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists passenger_document_audit_trigger on public.passenger_documents;
create trigger passenger_document_audit_trigger after insert or update on public.passenger_documents for each row execute function public.audit_passenger_document_change();

create or replace function public.prepare_passenger_document_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('VERIFIED', 'REJECTED') then
    new.verified_by := auth.uid();
    new.verified_at := now();
  elsif new.status in ('UPLOADED', 'UNDER_REVIEW') then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  if new.status <> 'REJECTED' then new.rejection_reason := null; end if;
  return new;
end;
$$;

drop trigger if exists passenger_document_review_trigger on public.passenger_documents;
create trigger passenger_document_review_trigger before update on public.passenger_documents for each row execute function public.prepare_passenger_document_review();

create or replace function public.refresh_passenger_document_expiry(target_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_passenger_request(target_request_id) then raise exception 'Not authorized'; end if;
  update public.passenger_documents
  set status = 'EXPIRED', updated_at = now()
  where request_id = target_request_id
    and expiry_date < current_date
    and status in ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED');
end;
$$;

grant execute on function public.refresh_passenger_document_expiry(uuid) to authenticated;

create policy passengers_select on public.passengers for select using (public.can_access_passenger_request(request_id));
create policy passengers_customer_insert on public.passengers for insert with check (
  exists (select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid())
);
create policy passengers_customer_update on public.passengers for update using (
  exists (select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid())
) with check (
  exists (select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid())
);
create policy passengers_staff_update on public.passengers for update using (public.is_role('SALES') or public.is_role('ADMIN')) with check (public.is_role('SALES') or public.is_role('ADMIN'));

create policy passenger_documents_select on public.passenger_documents for select using (public.can_access_passenger_request(request_id));
create policy passenger_documents_customer_insert on public.passenger_documents for insert with check (
  uploaded_by = auth.uid()
  and exists (select 1 from public.requests r where r.id = request_id and r.customer_id = auth.uid())
);
create policy passenger_documents_staff_update on public.passenger_documents for update using (public.is_role('SALES') or public.is_role('ADMIN')) with check ((public.is_role('SALES') or public.is_role('ADMIN')) and status in ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'));

insert into storage.buckets (id, name, public) values ('passenger-documents', 'passenger-documents', false) on conflict (id) do nothing;

drop policy if exists passenger_documents_storage_select on storage.objects;
create policy passenger_documents_storage_select on storage.objects for select using (
  bucket_id = 'passenger-documents'
  and (
    public.is_role('ADMIN')
    or public.is_role('SALES')
    or exists (
      select 1 from public.passengers p
      join public.requests r on r.id = p.request_id
      where r.customer_id = auth.uid()
        and (storage.foldername(name))[1] = auth.uid()::text
        and (storage.foldername(name))[2] = p.id::text
    )
  )
);

drop policy if exists passenger_documents_storage_insert on storage.objects;
create policy passenger_documents_storage_insert on storage.objects for insert with check (
  bucket_id = 'passenger-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.passengers p
    join public.requests r on r.id = p.request_id
    where r.customer_id = auth.uid() and (storage.foldername(name))[2] = p.id::text
  )
);

drop policy if exists passenger_documents_storage_delete on storage.objects;
create policy passenger_documents_storage_delete on storage.objects for delete using (
  bucket_id = 'passenger-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_role('ADMIN'))
);

alter table public.passengers add column if not exists updated_at timestamptz not null default now();
alter table public.passenger_documents add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_passenger_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists passengers_updated_at_trigger on public.passengers;
create trigger passengers_updated_at_trigger before update on public.passengers for each row execute function public.touch_passenger_updated_at();
drop trigger if exists passenger_documents_updated_at_trigger on public.passenger_documents;
create trigger passenger_documents_updated_at_trigger before update on public.passenger_documents for each row execute function public.touch_passenger_updated_at();

create or replace function public.passenger_compliance_requirements(target_passenger_id uuid)
returns table (document_type text) language sql stable security definer set search_path = public as $$
  select 'GOVERNMENT_PHOTO_ID'::text
  union all select 'PASSPORT' where exists (select 1 from public.passengers where id = target_passenger_id and is_foreign_national)
  union all select 'VISA' where exists (select 1 from public.passengers where id = target_passenger_id and visa_required)
  union all select 'GUARDIAN_CONSENT' where exists (select 1 from public.passengers where id = target_passenger_id and passenger_type = 'UNACCOMPANIED_MINOR')
  union all select 'MEDICAL_FITNESS_CERTIFICATE' where exists (select 1 from public.passengers where id = target_passenger_id and medical_fitness_required);
$$;

grant execute on function public.passenger_compliance_requirements(uuid) to authenticated;
