create table if not exists public.customer_booking_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  draft_data jsonb not null default '{}'::jsonb,
  current_step integer not null default 0 check (current_step between 0 and 5),
  request_id uuid unique references public.requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.customer_booking_drafts from anon;
grant select, insert, update, delete on public.customer_booking_drafts to authenticated;

create index if not exists customer_booking_drafts_customer_updated_idx
  on public.customer_booking_drafts(customer_id, updated_at desc)
  where request_id is null;

alter table public.customer_booking_drafts enable row level security;

drop policy if exists customer_booking_drafts_select_own on public.customer_booking_drafts;
create policy customer_booking_drafts_select_own on public.customer_booking_drafts
  for select using (customer_id = auth.uid() and public.is_role('CUSTOMER'));

drop policy if exists customer_booking_drafts_insert_own on public.customer_booking_drafts;
create policy customer_booking_drafts_insert_own on public.customer_booking_drafts
  for insert with check (customer_id = auth.uid() and public.is_role('CUSTOMER') and request_id is null);

drop policy if exists customer_booking_drafts_update_own on public.customer_booking_drafts;
create policy customer_booking_drafts_update_own on public.customer_booking_drafts
  for update using (customer_id = auth.uid() and public.is_role('CUSTOMER') and request_id is null)
  with check (customer_id = auth.uid() and public.is_role('CUSTOMER') and request_id is null);

drop policy if exists customer_booking_drafts_delete_own on public.customer_booking_drafts;
create policy customer_booking_drafts_delete_own on public.customer_booking_drafts
  for delete using (customer_id = auth.uid() and public.is_role('CUSTOMER') and request_id is null);

create or replace function public.submit_aircraft_booking_draft(target_draft_id uuid)
returns table (request_id uuid, request_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.customer_booking_drafts%rowtype;
  details jsonb;
  aircraft_type text;
  passenger_count integer;
  budget_amount numeric;
  currency_code text;
  new_request_id uuid;
  new_request_number text;
  passenger jsonb;
  inserted_count integer := 0;
  departure_timezone text;
  return_timezone text;
  departure_at timestamptz;
  return_at timestamptz;
begin
  if auth.uid() is null or not public.is_role('CUSTOMER') then
    raise exception 'Only an authenticated customer can submit an aircraft booking.';
  end if;

  select * into draft_row
  from public.customer_booking_drafts
  where id = target_draft_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Booking draft was not found or is not owned by the signed-in customer.';
  end if;

  if draft_row.request_id is not null then
    return query
      select r.id, r.request_number
      from public.requests r
      where r.id = draft_row.request_id;
    return;
  end if;

  details := draft_row.draft_data;
  aircraft_type := details->>'aircraft_type';
  passenger_count := (details->>'passenger_count')::integer;
  budget_amount := (details->>'budget')::numeric;
  currency_code := details->>'currency';

  if aircraft_type is null or aircraft_type not in ('helicopter', 'flight') then
    raise exception 'Choose a valid aircraft type.';
  end if;
  if passenger_count is null or passenger_count < 1 or passenger_count > 50 then
    raise exception 'Passenger count must be between 1 and 50.';
  end if;
  if budget_amount is null or budget_amount <= 0
     or currency_code is null
     or upper(currency_code) not in ('EUR', 'USD', 'GBP', 'AED', 'INR') then
    raise exception 'Enter a positive budget and valid currency.';
  end if;
  if coalesce(details->>'departure', '') = ''
     or coalesce(details->>'destination', '') = ''
     or lower(details->>'departure') = lower(details->>'destination') then
    raise exception 'Enter different departure and destination locations.';
  end if;
  if coalesce(details->>'departure_date', '') = ''
     or coalesce(details->>'departure_time', '') = '' then
    raise exception 'Enter a departure date and time.';
  end if;
  departure_timezone := coalesce(nullif(details->>'departure_timezone', ''), 'UTC');
  if not exists (select 1 from pg_timezone_names where name = departure_timezone) then
    raise exception 'Enter a valid departure timezone.';
  end if;
  departure_at := ((details->>'departure_date')::date + (details->>'departure_time')::time) at time zone departure_timezone;
  if departure_at <= now() then
    raise exception 'Departure date and time must be in the future.';
  end if;
  if details->>'trip_type' is null or details->>'trip_type' not in ('ONE_WAY', 'ROUND_TRIP') then
    raise exception 'Choose a valid trip type.';
  end if;
  if details->>'trip_type' = 'ROUND_TRIP'
     and (coalesce(details->>'return_date', '') = ''
       or coalesce(details->>'return_time', '') = '') then
    raise exception 'Enter a valid return date and time.';
  end if;
  if details->>'trip_type' = 'ROUND_TRIP' then
    return_timezone := coalesce(nullif(details->>'return_timezone', ''), departure_timezone);
    if not exists (select 1 from pg_timezone_names where name = return_timezone) then
      raise exception 'Enter a valid return timezone.';
    end if;
    return_at := ((details->>'return_date')::date + (details->>'return_time')::time) at time zone return_timezone;
    if return_at <= departure_at then
      raise exception 'Return date and time must be later than departure.';
    end if;
  end if;
  if coalesce(details #>> '{contact,full_name}', '') = ''
     or coalesce(details #>> '{contact,email}', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce(details #>> '{contact,mobile}', '') !~ '^[+()0-9 .-]{7,}$' then
    raise exception 'Complete the required customer contact details.';
  end if;
  if jsonb_typeof(details->'passengers') is distinct from 'array' then
    raise exception 'Passenger details must be provided as a list.';
  end if;
  if jsonb_array_length(details->'passengers') <> passenger_count then
    raise exception 'Passenger details must match the selected passenger count.';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.next_request_number'));
  new_request_number := public.next_request_number();
  insert into public.requests (
    request_number, customer_id, service_type, service_subtype, status,
    request_mode, people_count, budget, currency, departure, destination,
    start_date, end_date, trip_type, additional_requirements,
    customer_details, service_details
  ) values (
    new_request_number, auth.uid(), 'AVIATION', aircraft_type, 'SUBMITTED',
    'BOOKING', passenger_count, budget_amount, upper(currency_code),
    details->>'departure', details->>'destination',
    (details->>'departure_date')::date,
    nullif(details->>'return_date', '')::date,
    details->>'trip_type',
    nullif(details->>'additional_requirements', ''),
    jsonb_build_object(
      'name', details #>> '{contact,full_name}',
      'full_name', details #>> '{contact,full_name}',
      'email', details #>> '{contact,email}',
      'mobile', details #>> '{contact,mobile}',
      'country', nullif(details #>> '{contact,country}', ''),
      'company', nullif(details #>> '{contact,company}', ''),
      'preferred_contact_method', nullif(details #>> '{contact,preferred_contact_method}', ''),
      'contact_notes', nullif(details #>> '{contact,contact_notes}', '')
    ),
    jsonb_build_object(
      'source', 'aircraft_booking_flow',
      'aircraft_type', aircraft_type,
      'aircraft_preference', nullif(details->>'aircraft_preference', ''),
      'departure_time', details->>'departure_time',
      'return_time', nullif(details->>'return_time', ''),
      'departure_timezone', nullif(details->>'departure_timezone', ''),
      'return_timezone', nullif(details->>'return_timezone', ''),
      'flexible_dates', coalesce((details->>'flexible_dates')::boolean, false),
      'preferred_departure_window', nullif(details->>'preferred_departure_window', ''),
      'flight_purpose', nullif(details->>'flight_purpose', ''),
      'route_notes', nullif(details->>'route_notes', ''),
      'special_assistance', nullif(details->>'special_assistance', ''),
      'accessibility_requirements', nullif(details->>'accessibility_requirements', ''),
      'medical_assistance_required', coalesce((details->>'medical_assistance_required')::boolean, false),
      'baggage_notes', nullif(details->>'baggage_notes', '')
    )
  ) returning id into new_request_id;

  for passenger in select value from jsonb_array_elements(details->'passengers')
  loop
    if coalesce(passenger->>'full_legal_name', '') = ''
       or coalesce(passenger->>'nationality', '') = ''
       or coalesce(passenger->>'emergency_contact_name', '') = ''
       or coalesce(passenger->>'emergency_contact_relationship', '') = ''
       or coalesce(passenger->>'emergency_contact_phone', '') = ''
       or coalesce(passenger->>'next_of_kin_name', '') = ''
       or coalesce(passenger->>'next_of_kin_relationship', '') = ''
       or coalesce(passenger->>'next_of_kin_phone', '') = '' then
      raise exception 'Complete the required passenger and contact details.';
    end if;
    if nullif(passenger->>'date_of_birth', '') is not null
       and (passenger->>'date_of_birth')::date > current_date then
      raise exception 'Passenger date of birth cannot be in the future.';
    end if;
    insert into public.passengers (
      request_id, full_legal_name, date_of_birth, nationality, passenger_type,
      is_foreign_national, visa_required, medical_fitness_required,
      contact_email, contact_phone, emergency_contact_name,
      emergency_contact_relationship, emergency_contact_phone,
      next_of_kin_name, next_of_kin_relationship, next_of_kin_phone
    ) values (
      new_request_id,
      passenger->>'full_legal_name',
      nullif(passenger->>'date_of_birth', '')::date,
      passenger->>'nationality',
      passenger->>'passenger_type',
      coalesce((passenger->>'is_foreign_national')::boolean, false),
      coalesce((passenger->>'visa_required')::boolean, false),
      coalesce((passenger->>'medical_fitness_required')::boolean, false),
      nullif(passenger->>'contact_email', ''),
      nullif(passenger->>'contact_phone', ''),
      passenger->>'emergency_contact_name',
      passenger->>'emergency_contact_relationship',
      passenger->>'emergency_contact_phone',
      passenger->>'next_of_kin_name',
      passenger->>'next_of_kin_relationship',
      passenger->>'next_of_kin_phone'
    );
    inserted_count := inserted_count + 1;
  end loop;

  if inserted_count <> passenger_count then
    raise exception 'Passenger records could not be saved.';
  end if;

  insert into public.request_timeline (request_id, actor_id, event_type, message)
  values (new_request_id, auth.uid(), 'REQUEST_SUBMITTED', 'Aircraft booking request submitted');

  update public.customer_booking_drafts
  set request_id = new_request_id, draft_data = '{}'::jsonb, updated_at = now()
  where id = target_draft_id;

  return query select new_request_id, new_request_number;
end;
$$;

revoke all on function public.submit_aircraft_booking_draft(uuid) from public, anon;
grant execute on function public.submit_aircraft_booking_draft(uuid) to authenticated;
