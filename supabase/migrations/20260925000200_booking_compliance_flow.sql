create table if not exists public.booking_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  pnr text not null unique,
  booking_status text not null default 'CONFIRMED' check (booking_status in ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  booking_date timestamptz not null default now(),
  travel_date date,
  departure text,
  destination text,
  aircraft_kind text,
  aircraft_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete cascade,
  ticket_number text not null unique,
  ticket_status text not null default 'ISSUED' check (ticket_status in ('ISSUED', 'VOID')),
  passenger_name text not null,
  sector text,
  ticket_data jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id),
  generated_at timestamptz not null default now(),
  unique (booking_id, passenger_id)
);

alter table public.passengers add column if not exists booking_id uuid references public.booking_records(id) on delete cascade;
alter table public.passengers add column if not exists pnr text;
alter table public.passenger_documents add column if not exists original_document_seen boolean not null default false;
alter table public.passenger_documents add column if not exists original_verified_by uuid references public.profiles(id);
alter table public.passenger_documents add column if not exists original_verified_at timestamptz;
alter table public.passenger_documents add column if not exists verification_notes text;

create table if not exists public.passenger_weight_declarations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete cascade,
  body_weight_kg numeric(7,2) not null check (body_weight_kg > 0 and body_weight_kg <= 500),
  hand_baggage_weight_kg numeric(7,2) not null check (hand_baggage_weight_kg >= 0 and hand_baggage_weight_kg <= 200),
  body_weight_confirmed boolean not null default false,
  hand_baggage_confirmed boolean not null default false,
  consent_text text not null,
  declared_by uuid not null references public.profiles(id),
  declared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, passenger_id)
);

create table if not exists public.physical_weighings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete cascade,
  declared_weight_declaration_id uuid references public.passenger_weight_declarations(id),
  measured_body_weight_kg numeric(7,2) not null check (measured_body_weight_kg > 0 and measured_body_weight_kg <= 500),
  measured_hand_baggage_weight_kg numeric(7,2) not null check (measured_hand_baggage_weight_kg >= 0 and measured_hand_baggage_weight_kg <= 200),
  verified boolean not null default false,
  performed_by uuid not null references public.profiles(id),
  performed_at timestamptz not null default now(),
  notes text
);

create table if not exists public.aircraft_operational_config (
  id uuid primary key default gen_random_uuid(),
  aircraft_kind text not null check (aircraft_kind in ('flight', 'helicopter')),
  aircraft_model text not null,
  maximum_payload_kg numeric(9,2) check (maximum_payload_kg > 0),
  baggage_capacity_kg numeric(9,2) check (baggage_capacity_kg > 0),
  configured_by uuid references public.profiles(id),
  configured_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (aircraft_kind, aircraft_model)
);

create table if not exists public.weight_balance_calculations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.booking_records(id) on delete cascade,
  aircraft_config_id uuid references public.aircraft_operational_config(id),
  total_passenger_weight_kg numeric(9,2) not null default 0,
  total_baggage_weight_kg numeric(9,2) not null default 0,
  total_additional_load_kg numeric(9,2) not null default 0,
  applicable_payload_limit_kg numeric(9,2),
  remaining_capacity_kg numeric(9,2),
  calculation_status text not null check (calculation_status in ('INCOMPLETE', 'VALID', 'WARNING', 'OVER_LIMIT')),
  calculation_notes text,
  calculated_by uuid references public.profiles(id),
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passenger_checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete cascade,
  name_match_status text not null default 'PENDING' check (name_match_status in ('PENDING', 'VERIFIED', 'MISMATCH', 'REQUIRES_REVIEW')),
  original_document_verified boolean not null default false,
  weight_verified boolean not null default false,
  briefing_completed boolean not null default false,
  checkin_status text not null default 'PENDING' check (checkin_status in ('PENDING', 'CLEARED', 'BLOCKED', 'REQUIRES_REVIEW')),
  checked_in_by uuid references public.profiles(id),
  checked_in_at timestamptz,
  notes text,
  updated_at timestamptz not null default now(),
  unique (booking_id, passenger_id)
);

create table if not exists public.passenger_briefings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete cascade,
  seatbelt_harness_acknowledged boolean not null default false,
  headset_hearing_acknowledged boolean not null default false,
  emergency_exits_acknowledged boolean not null default false,
  brace_position_acknowledged boolean not null default false,
  no_smoking_acknowledged boolean not null default false,
  rotor_loose_item_safety_acknowledged boolean not null default false,
  no_standing_rotor_operation_acknowledged boolean not null default false,
  weight_baggage_confirmed boolean not null default false,
  photography_drone_acknowledged boolean not null default false,
  diversion_delay_acknowledged boolean not null default false,
  photography_restrictions_applicable boolean not null default false,
  acknowledged_by uuid not null references public.profiles(id),
  acknowledged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, passenger_id)
);

create index if not exists booking_records_pnr_idx on public.booking_records(pnr);
create index if not exists booking_tickets_passenger_idx on public.booking_tickets(passenger_id);
create index if not exists passenger_weight_declarations_booking_idx on public.passenger_weight_declarations(booking_id);
create index if not exists physical_weighings_booking_idx on public.physical_weighings(booking_id);
create index if not exists passenger_checkins_booking_idx on public.passenger_checkins(booking_id);
create index if not exists passenger_briefings_booking_idx on public.passenger_briefings(booking_id);

create or replace function public.booking_sector(target_booking_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when departure is null and destination is null then null
    else coalesce(departure, 'TBC') || ' -> ' || coalesce(destination, 'TBC')
  end
  from public.booking_records where id = target_booking_id;
$$;

create or replace function public.create_booking_for_request(target_request_id uuid)
returns public.booking_records language plpgsql security definer set search_path = public as $$
declare result public.booking_records; request_row public.requests;
begin
  select * into request_row from public.requests where id = target_request_id;
  if request_row.id is null then raise exception 'Request not found'; end if;
  if not (request_row.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN')) then raise exception 'Not authorized'; end if;
  insert into public.booking_records (request_id, pnr, travel_date, departure, destination, aircraft_kind, aircraft_model)
  values (
    request_row.id,
    'HJ' || upper(substr(md5(request_row.id::text), 1, 8)),
    request_row.start_date,
    request_row.departure,
    request_row.destination,
    request_row.service_details->>'aircraft_kind',
    request_row.service_details->>'aircraft_model'
  ) on conflict (request_id) do update set updated_at = now()
  returning * into result;
  update public.passengers set booking_id = result.id, pnr = result.pnr where request_id = target_request_id and (booking_id is null or booking_id <> result.id);
  return result;
end;
$$;

grant execute on function public.create_booking_for_request(uuid) to authenticated;

create or replace function public.ensure_booking_on_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'BOOKED' and (old.status is distinct from new.status) then
    perform public.create_booking_for_request(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists requests_booking_confirmation_trigger on public.requests;
create trigger requests_booking_confirmation_trigger after update on public.requests for each row execute function public.ensure_booking_on_confirmation();

create or replace function public.sync_passenger_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare booking_row public.booking_records;
begin
  select * into booking_row from public.booking_records where request_id = new.request_id;
  if booking_row.id is not null then
    new.booking_id := booking_row.id;
    new.pnr := booking_row.pnr;
  end if;
  return new;
end;
$$;

drop trigger if exists passenger_booking_sync_trigger on public.passengers;
create trigger passenger_booking_sync_trigger before insert or update on public.passengers for each row execute function public.sync_passenger_booking();

insert into public.booking_records (request_id, pnr, travel_date, departure, destination, aircraft_kind, aircraft_model)
select r.id, 'HJ' || upper(substr(md5(r.id::text), 1, 8)), r.start_date, r.departure, r.destination, r.service_details->>'aircraft_kind', r.service_details->>'aircraft_model'
from public.requests r
where r.status = 'BOOKED'
on conflict (request_id) do nothing;

update public.passengers p set booking_id = b.id, pnr = b.pnr from public.booking_records b where b.request_id = p.request_id and (p.booking_id is null or p.pnr is null);

create or replace function public.issue_passenger_ticket(target_passenger_id uuid)
returns public.booking_tickets language plpgsql security definer set search_path = public as $$
declare passenger_row public.passengers; booking_row public.booking_records; result public.booking_tickets; sector_value text;
begin
  select * into passenger_row from public.passengers where id = target_passenger_id and status = 'ACTIVE';
  if passenger_row.id is null then raise exception 'Passenger not found'; end if;
  select * into booking_row from public.booking_records where id = passenger_row.booking_id and booking_status = 'CONFIRMED';
  if booking_row.id is null then raise exception 'Confirmed booking not found'; end if;
  if not (exists (select 1 from public.requests r where r.id = booking_row.request_id and r.customer_id = auth.uid()) or public.is_role('SALES') or public.is_role('ADMIN')) then raise exception 'Not authorized'; end if;
  sector_value := public.booking_sector(booking_row.id);
  insert into public.booking_tickets (booking_id, passenger_id, ticket_number, passenger_name, sector, ticket_data, generated_by)
  values (booking_row.id, passenger_row.id, 'ET-' || booking_row.pnr || '-' || upper(substr(replace(passenger_row.id::text, '-', ''), 1, 6)), passenger_row.full_legal_name, sector_value, jsonb_build_object('operator', 'HELITEJET', 'pnr', booking_row.pnr, 'passenger_name', passenger_row.full_legal_name, 'sector', sector_value, 'booking_date', booking_row.booking_date, 'travel_date', booking_row.travel_date, 'departure', booking_row.departure, 'destination', booking_row.destination, 'passenger_status', passenger_row.status, 'baggage_status', 'DECLARATION_REQUIRED', 'weight_declaration_status', 'REQUIRED', 'checkin_status', 'PENDING'), auth.uid())
  on conflict (booking_id, passenger_id) do update set passenger_name = excluded.passenger_name, sector = excluded.sector, ticket_data = excluded.ticket_data, generated_by = excluded.generated_by, generated_at = now(), ticket_status = 'ISSUED'
  returning * into result;
  return result;
end;
$$;

grant execute on function public.issue_passenger_ticket(uuid) to authenticated;

create or replace function public.compare_passenger_ticket_name(target_passenger_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare passenger_name text; ticket_name text;
begin
  select full_legal_name into passenger_name from public.passengers where id = target_passenger_id;
  select passenger_name into ticket_name from public.booking_tickets where passenger_id = target_passenger_id and ticket_status = 'ISSUED' order by generated_at desc limit 1;
  if ticket_name is null then return 'PENDING'; end if;
  if upper(regexp_replace(passenger_name, '[^A-Z0-9]', '', 'gi')) = upper(regexp_replace(ticket_name, '[^A-Z0-9]', '', 'gi')) then return 'VERIFIED'; end if;
  return 'MISMATCH';
end;
$$;

grant execute on function public.compare_passenger_ticket_name(uuid) to authenticated;

create or replace function public.calculate_booking_weight_balance(target_booking_id uuid)
returns public.weight_balance_calculations language plpgsql security definer set search_path = public as $$
declare result public.weight_balance_calculations; booking_row public.booking_records; config_row public.aircraft_operational_config; passenger_total numeric := 0; baggage_total numeric := 0; missing_count integer := 0; load_total numeric; calc_status text; notes text;
begin
  select * into booking_row from public.booking_records where id = target_booking_id;
  if booking_row.id is null or not (exists (select 1 from public.requests r where r.id = booking_row.request_id and r.customer_id = auth.uid()) or public.is_role('SALES') or public.is_role('ADMIN')) then raise exception 'Not authorized'; end if;
  select * into config_row from public.aircraft_operational_config where aircraft_kind = booking_row.aircraft_kind and aircraft_model = booking_row.aircraft_model;
  select coalesce(sum(measured_body_weight_kg), 0), coalesce(sum(measured_hand_baggage_weight_kg), 0), count(*) filter (where verified = false)
    into passenger_total, baggage_total, missing_count from public.physical_weighings where booking_id = target_booking_id;
  load_total := passenger_total + baggage_total;
  if config_row.id is null or config_row.maximum_payload_kg is null or missing_count > 0 then calc_status := 'INCOMPLETE'; notes := 'Aircraft limit or verified physical weighing is missing.';
  elsif load_total > config_row.maximum_payload_kg then calc_status := 'OVER_LIMIT'; notes := 'Verified load exceeds configured aircraft payload limit.';
  elsif load_total > config_row.maximum_payload_kg * 0.9 then calc_status := 'WARNING'; notes := 'Verified load is within the configured limit but near capacity.';
  else calc_status := 'VALID'; notes := 'Calculated from verified physical weighing records.'; end if;
  insert into public.weight_balance_calculations (booking_id, aircraft_config_id, total_passenger_weight_kg, total_baggage_weight_kg, total_additional_load_kg, applicable_payload_limit_kg, remaining_capacity_kg, calculation_status, calculation_notes, calculated_by)
  values (target_booking_id, config_row.id, passenger_total, baggage_total, 0, config_row.maximum_payload_kg, case when config_row.maximum_payload_kg is null then null else config_row.maximum_payload_kg - load_total end, calc_status, notes, auth.uid())
  on conflict (booking_id) do update set aircraft_config_id = excluded.aircraft_config_id, total_passenger_weight_kg = excluded.total_passenger_weight_kg, total_baggage_weight_kg = excluded.total_baggage_weight_kg, applicable_payload_limit_kg = excluded.applicable_payload_limit_kg, remaining_capacity_kg = excluded.remaining_capacity_kg, calculation_status = excluded.calculation_status, calculation_notes = excluded.calculation_notes, calculated_by = excluded.calculated_by, calculated_at = now(), updated_at = now()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.calculate_booking_weight_balance(uuid) to authenticated;

create or replace function public.complete_passenger_checkin(target_passenger_id uuid)
returns public.passenger_checkins language plpgsql security definer set search_path = public as $$
declare passenger_row public.passengers; booking_row public.booking_records; declaration_row public.passenger_weight_declarations; weighing_row public.physical_weighings; briefing_row public.passenger_briefings; checkin_row public.passenger_checkins; name_status text; original_ok boolean;
begin
  select * into passenger_row from public.passengers where id = target_passenger_id;
  select * into booking_row from public.booking_records where id = passenger_row.booking_id;
  if not (public.is_role('SALES') or public.is_role('ADMIN')) then raise exception 'Only operational staff can complete check-in'; end if;
  select * into declaration_row from public.passenger_weight_declarations where passenger_id = target_passenger_id and booking_id = booking_row.id;
  select * into weighing_row from public.physical_weighings where passenger_id = target_passenger_id and booking_id = booking_row.id and verified order by performed_at desc limit 1;
  select * into briefing_row from public.passenger_briefings where passenger_id = target_passenger_id and booking_id = booking_row.id;
  select public.compare_passenger_ticket_name(target_passenger_id) into name_status;
  select exists (select 1 from public.passenger_documents where passenger_id = target_passenger_id and status = 'VERIFIED' and original_document_seen) into original_ok;
  if declaration_row.id is null or weighing_row.id is null or briefing_row.id is null or name_status <> 'VERIFIED' or not original_ok then
    insert into public.passenger_checkins (booking_id, passenger_id, name_match_status, original_document_verified, weight_verified, briefing_completed, checkin_status, checked_in_by, notes)
    values (booking_row.id, target_passenger_id, name_status, original_ok, weighing_row.id is not null, briefing_row.id is not null, case when name_status = 'MISMATCH' then 'REQUIRES_REVIEW' else 'BLOCKED' end, auth.uid(), 'Mandatory compliance steps are incomplete.')
    on conflict (booking_id, passenger_id) do update set name_match_status = excluded.name_match_status, original_document_verified = excluded.original_document_verified, weight_verified = excluded.weight_verified, briefing_completed = excluded.briefing_completed, checkin_status = excluded.checkin_status, checked_in_by = excluded.checked_in_by, checked_in_at = now(), notes = excluded.notes, updated_at = now()
    returning * into checkin_row;
    return checkin_row;
  end if;
  insert into public.passenger_checkins (booking_id, passenger_id, name_match_status, original_document_verified, weight_verified, briefing_completed, checkin_status, checked_in_by, checked_in_at, notes)
  values (booking_row.id, target_passenger_id, 'VERIFIED', true, true, true, 'CLEARED', auth.uid(), now(), 'All mandatory compliance steps complete.')
  on conflict (booking_id, passenger_id) do update set name_match_status = 'VERIFIED', original_document_verified = true, weight_verified = true, briefing_completed = true, checkin_status = 'CLEARED', checked_in_by = auth.uid(), checked_in_at = now(), notes = 'All mandatory compliance steps complete.', updated_at = now()
  returning * into checkin_row;
  return checkin_row;
end;
$$;

grant execute on function public.complete_passenger_checkin(uuid) to authenticated;

create or replace function public.save_passenger_weight_declaration(target_booking_id uuid, target_passenger_id uuid, target_body_weight_kg numeric, target_hand_baggage_weight_kg numeric)
returns public.passenger_weight_declarations language plpgsql security definer set search_path = public as $$
declare result public.passenger_weight_declarations;
begin
  if not exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = target_booking_id and r.customer_id = auth.uid()) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.passengers where id = target_passenger_id and booking_id = target_booking_id and status = 'ACTIVE') then raise exception 'Passenger does not belong to booking'; end if;
  insert into public.passenger_weight_declarations (booking_id, passenger_id, body_weight_kg, hand_baggage_weight_kg, body_weight_confirmed, hand_baggage_confirmed, consent_text, declared_by)
  values (target_booking_id, target_passenger_id, target_body_weight_kg, target_hand_baggage_weight_kg, true, true, 'I confirm that the declared passenger and hand-baggage weights are accurate.', auth.uid())
  on conflict (booking_id, passenger_id) do update set body_weight_kg = excluded.body_weight_kg, hand_baggage_weight_kg = excluded.hand_baggage_weight_kg, body_weight_confirmed = true, hand_baggage_confirmed = true, consent_text = excluded.consent_text, declared_by = auth.uid(), declared_at = now(), updated_at = now()
  returning * into result;
  perform public.passenger_audit_event(target_booking_id, target_passenger_id, null, 'WEIGHT_DECLARATION_SUBMITTED', 'Passenger body and hand-baggage weights declared', jsonb_build_object('body_weight_kg', target_body_weight_kg, 'hand_baggage_weight_kg', target_hand_baggage_weight_kg));
  return result;
end;
$$;

grant execute on function public.save_passenger_weight_declaration(uuid, uuid, numeric, numeric) to authenticated;

create or replace function public.save_passenger_briefing(target_booking_id uuid, target_passenger_id uuid, target_photography_restrictions_applicable boolean)
returns public.passenger_briefings language plpgsql security definer set search_path = public as $$
declare result public.passenger_briefings;
begin
  if not exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = target_booking_id and r.customer_id = auth.uid()) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.passengers where id = target_passenger_id and booking_id = target_booking_id and status = 'ACTIVE') then raise exception 'Passenger does not belong to booking'; end if;
  insert into public.passenger_briefings (booking_id, passenger_id, seatbelt_harness_acknowledged, headset_hearing_acknowledged, emergency_exits_acknowledged, brace_position_acknowledged, no_smoking_acknowledged, rotor_loose_item_safety_acknowledged, no_standing_rotor_operation_acknowledged, weight_baggage_confirmed, photography_drone_acknowledged, diversion_delay_acknowledged, photography_restrictions_applicable, acknowledged_by)
  values (target_booking_id, target_passenger_id, true, true, true, true, true, true, true, true, true, true, target_photography_restrictions_applicable, auth.uid())
  on conflict (booking_id, passenger_id) do update set seatbelt_harness_acknowledged = true, headset_hearing_acknowledged = true, emergency_exits_acknowledged = true, brace_position_acknowledged = true, no_smoking_acknowledged = true, rotor_loose_item_safety_acknowledged = true, no_standing_rotor_operation_acknowledged = true, weight_baggage_confirmed = true, photography_drone_acknowledged = true, diversion_delay_acknowledged = true, photography_restrictions_applicable = excluded.photography_restrictions_applicable, acknowledged_by = auth.uid(), acknowledged_at = now(), updated_at = now()
  returning * into result;
  perform public.passenger_audit_event(target_booking_id, target_passenger_id, null, 'PASSENGER_BRIEFING_ACKNOWLEDGED', 'Passenger briefing acknowledged', jsonb_build_object('photography_restrictions_applicable', target_photography_restrictions_applicable));
  return result;
end;
$$;

grant execute on function public.save_passenger_briefing(uuid, uuid, boolean) to authenticated;

create or replace function public.record_physical_weighing(target_booking_id uuid, target_passenger_id uuid, target_body_weight_kg numeric, target_hand_baggage_weight_kg numeric, target_verified boolean, target_notes text)
returns public.physical_weighings language plpgsql security definer set search_path = public as $$
declare result public.physical_weighings; declaration_id uuid;
begin
  if not (public.is_role('SALES') or public.is_role('ADMIN')) then raise exception 'Only operational staff can record physical weighing'; end if;
  select id into declaration_id from public.passenger_weight_declarations where booking_id = target_booking_id and passenger_id = target_passenger_id;
  insert into public.physical_weighings (booking_id, passenger_id, declared_weight_declaration_id, measured_body_weight_kg, measured_hand_baggage_weight_kg, verified, performed_by, notes)
  values (target_booking_id, target_passenger_id, declaration_id, target_body_weight_kg, target_hand_baggage_weight_kg, target_verified, auth.uid(), target_notes)
  returning * into result;
  perform public.passenger_audit_event(target_booking_id, target_passenger_id, null, 'PHYSICAL_WEIGHING_RECORDED', 'Physical passenger and hand-baggage weighing recorded', jsonb_build_object('body_weight_kg', target_body_weight_kg, 'hand_baggage_weight_kg', target_hand_baggage_weight_kg, 'verified', target_verified));
  return result;
end;
$$;

grant execute on function public.record_physical_weighing(uuid, uuid, numeric, numeric, boolean, text) to authenticated;

alter table public.booking_records enable row level security;
alter table public.booking_tickets enable row level security;
alter table public.passenger_weight_declarations enable row level security;
alter table public.physical_weighings enable row level security;
alter table public.aircraft_operational_config enable row level security;
alter table public.weight_balance_calculations enable row level security;
alter table public.passenger_checkins enable row level security;
alter table public.passenger_briefings enable row level security;

create policy booking_records_select on public.booking_records for select using (exists (select 1 from public.requests r where r.id = request_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy booking_tickets_select on public.booking_tickets for select using (exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy passenger_weight_declarations_select on public.passenger_weight_declarations for select using (exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy passenger_weight_declarations_customer_write on public.passenger_weight_declarations for insert with check (declared_by = auth.uid() and exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and r.customer_id = auth.uid()));
create policy physical_weighings_select on public.physical_weighings for select using (public.is_role('SALES') or public.is_role('ADMIN') or exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and r.customer_id = auth.uid()));
create policy physical_weighings_staff_write on public.physical_weighings for all using (public.is_role('SALES') or public.is_role('ADMIN')) with check ((public.is_role('SALES') or public.is_role('ADMIN')) and performed_by = auth.uid());
create policy aircraft_operational_config_select on public.aircraft_operational_config for select using (auth.uid() is not null);
create policy aircraft_operational_config_admin_write on public.aircraft_operational_config for all using (public.is_role('ADMIN')) with check (public.is_role('ADMIN'));
create policy weight_balance_select on public.weight_balance_calculations for select using (exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy passenger_checkins_select on public.passenger_checkins for select using (exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy passenger_briefings_select on public.passenger_briefings for select using (exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN'))));
create policy passenger_briefings_customer_write on public.passenger_briefings for insert with check (acknowledged_by = auth.uid() and exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id where b.id = booking_id and r.customer_id = auth.uid()));
