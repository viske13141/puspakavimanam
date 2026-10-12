alter table public.passengers add column if not exists sector text;
alter table public.passenger_documents add column if not exists visa_type text;
alter table public.passenger_weight_declarations add column if not exists signature_name text;
alter table public.passenger_checkins add column if not exists name_reviewed_by uuid references public.profiles(id);
alter table public.passenger_checkins add column if not exists name_reviewed_at timestamptz;
alter table public.passenger_checkins add column if not exists name_review_notes text;
alter table public.booking_records add column if not exists photography_restrictions_applicable boolean not null default false;
alter table public.passenger_briefings add column if not exists headset_provided boolean not null default false;

create table if not exists public.booking_diversions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_records(id) on delete cascade,
  original_destination text not null,
  revised_destination text not null check (length(trim(revised_destination)) >= 2),
  diversion_time timestamptz not null,
  reason text not null check (reason in ('WEATHER', 'TECHNICAL', 'MEDICAL', 'FUEL', 'PASSENGER_REQUEST', 'ATC', 'SECURITY', 'OTHER')),
  reason_details text not null check (length(trim(reason_details)) >= 3),
  pic_name text not null check (length(trim(pic_name)) >= 2),
  atc_fic_notified boolean not null default false,
  dispatch_notified boolean not null default false,
  passenger_care_action text not null check (length(trim(passenger_care_action)) >= 3),
  landing_permission_status text not null check (landing_permission_status in ('PENDING', 'OBTAINED', 'NOT_REQUIRED', 'NOT_VERIFIED')),
  reporting_status text not null check (reporting_status in ('NOT_ASSESSED', 'NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'REVIEW_REQUIRED')),
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default now()
);
create index if not exists booking_diversions_booking_id_idx on public.booking_diversions(booking_id);
alter table public.booking_diversions enable row level security;
create policy booking_diversions_select on public.booking_diversions for select using (
  exists (select 1 from public.booking_records b join public.requests r on r.id = b.request_id
    where b.id = booking_id and (r.customer_id = auth.uid() or public.is_role('SALES') or public.is_role('ADMIN')))
);
revoke all on public.booking_diversions from public, anon, authenticated;
grant select on public.booking_diversions to authenticated;

alter table public.passenger_weight_declarations alter column signature_name set default '';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passenger_document_passport_visa_metadata_check') THEN
    ALTER TABLE public.passenger_documents ADD CONSTRAINT passenger_document_passport_visa_metadata_check
      CHECK (document_type NOT IN ('PASSPORT', 'VISA') OR
        (NULLIF(trim(document_reference), '') IS NOT NULL AND expiry_date IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passenger_document_dates_check') THEN
    ALTER TABLE public.passenger_documents ADD CONSTRAINT passenger_document_dates_check
      CHECK (issue_date IS NULL OR expiry_date IS NULL OR expiry_date >= issue_date) NOT VALID;
  END IF;
END $$;

DROP POLICY IF EXISTS passenger_documents_customer_insert ON public.passenger_documents;
CREATE POLICY passenger_documents_customer_insert ON public.passenger_documents FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.customer_id = auth.uid())
  AND (document_type NOT IN ('PASSPORT', 'VISA') OR
    (NULLIF(trim(document_reference), '') IS NOT NULL AND expiry_date IS NOT NULL))
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passengers_id_booking_id_key') THEN
    ALTER TABLE public.passengers ADD CONSTRAINT passengers_id_booking_id_key UNIQUE (id, booking_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_records_id_request_id_key') THEN
    ALTER TABLE public.booking_records ADD CONSTRAINT booking_records_id_request_id_key UNIQUE (id, request_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passengers_booking_request_fk') THEN
    ALTER TABLE public.passengers ADD CONSTRAINT passengers_booking_request_fk
      FOREIGN KEY (booking_id, request_id) REFERENCES public.booking_records(id, request_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_tickets_passenger_booking_fk') THEN
    ALTER TABLE public.booking_tickets ADD CONSTRAINT booking_tickets_passenger_booking_fk
      FOREIGN KEY (passenger_id, booking_id) REFERENCES public.passengers(id, booking_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weight_declarations_passenger_booking_fk') THEN
    ALTER TABLE public.passenger_weight_declarations ADD CONSTRAINT weight_declarations_passenger_booking_fk
      FOREIGN KEY (passenger_id, booking_id) REFERENCES public.passengers(id, booking_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_weighings_passenger_booking_fk') THEN
    ALTER TABLE public.physical_weighings ADD CONSTRAINT physical_weighings_passenger_booking_fk
      FOREIGN KEY (passenger_id, booking_id) REFERENCES public.passengers(id, booking_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passenger_checkins_passenger_booking_fk') THEN
    ALTER TABLE public.passenger_checkins ADD CONSTRAINT passenger_checkins_passenger_booking_fk
      FOREIGN KEY (passenger_id, booking_id) REFERENCES public.passengers(id, booking_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'passenger_briefings_passenger_booking_fk') THEN
    ALTER TABLE public.passenger_briefings ADD CONSTRAINT passenger_briefings_passenger_booking_fk
      FOREIGN KEY (passenger_id, booking_id) REFERENCES public.passengers(id, booking_id) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.booking_compliance_audit(
  target_booking_id uuid,
  target_passenger_id uuid,
  target_document_id uuid,
  target_event_type text,
  target_message text,
  target_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE linked_request_id uuid;
BEGIN
  SELECT request_id INTO linked_request_id FROM public.booking_records WHERE id = target_booking_id;
  IF linked_request_id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  PERFORM public.passenger_audit_event(
    linked_request_id, target_passenger_id, target_document_id,
    target_event_type, target_message, COALESCE(target_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_booking_diversion(
  target_booking_id uuid,
  target_revised_destination text,
  target_reason text,
  target_reason_details text,
  target_pic_name text,
  target_diversion_time timestamptz,
  target_atc_fic_notified boolean,
  target_dispatch_notified boolean,
  target_passenger_care_action text,
  target_landing_permission_status text,
  target_reporting_status text
)
RETURNS public.booking_diversions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE booking_row public.booking_records; diversion_row public.booking_diversions;
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN
    RAISE EXCEPTION 'Only authorized operations staff can record a diversion';
  END IF;
  SELECT * INTO booking_row FROM public.booking_records WHERE id = target_booking_id AND booking_status = 'CONFIRMED';
  IF booking_row.id IS NULL THEN RAISE EXCEPTION 'Confirmed booking not found'; END IF;
  IF length(trim(target_revised_destination)) < 2 OR target_revised_destination = booking_row.destination THEN
    RAISE EXCEPTION 'Enter a revised destination different from the original';
  END IF;
  IF target_reason NOT IN ('WEATHER', 'TECHNICAL', 'MEDICAL', 'FUEL', 'PASSENGER_REQUEST', 'ATC', 'SECURITY', 'OTHER')
    OR length(trim(target_reason_details)) < 3 OR length(trim(target_pic_name)) < 2
    OR length(trim(target_passenger_care_action)) < 3 THEN
    RAISE EXCEPTION 'Complete the diversion reason, PIC, and passenger-care action';
  END IF;
  IF target_landing_permission_status NOT IN ('PENDING', 'OBTAINED', 'NOT_REQUIRED', 'NOT_VERIFIED')
    OR target_reporting_status NOT IN ('NOT_ASSESSED', 'NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'REVIEW_REQUIRED') THEN
    RAISE EXCEPTION 'Invalid landing-permission or reporting status';
  END IF;
  INSERT INTO public.booking_diversions (
    booking_id, original_destination, revised_destination, diversion_time, reason, reason_details,
    pic_name, atc_fic_notified, dispatch_notified, passenger_care_action,
    landing_permission_status, reporting_status, recorded_by
  ) VALUES (
    booking_row.id, COALESCE(booking_row.destination, 'Not recorded'), trim(target_revised_destination),
    target_diversion_time, target_reason, trim(target_reason_details), trim(target_pic_name),
    target_atc_fic_notified, target_dispatch_notified, trim(target_passenger_care_action),
    target_landing_permission_status, target_reporting_status, auth.uid()
  ) RETURNING * INTO diversion_row;
  UPDATE public.requests SET destination = trim(target_revised_destination), updated_at = now()
  WHERE id = booking_row.request_id;
  PERFORM public.booking_compliance_audit(booking_row.id, NULL, NULL,
    'BOOKING_DIVERSION_RECORDED', 'Diversion recorded by operations staff',
    jsonb_build_object('diversion_id', diversion_row.id, 'original_destination', diversion_row.original_destination,
      'revised_destination', diversion_row.revised_destination, 'reason', diversion_row.reason,
      'pic_name', diversion_row.pic_name, 'atc_fic_notified', diversion_row.atc_fic_notified,
      'dispatch_notified', diversion_row.dispatch_notified,
      'landing_permission_status', diversion_row.landing_permission_status,
      'reporting_status', diversion_row.reporting_status));
  RETURN diversion_row;
END;
$$;
REVOKE ALL ON FUNCTION public.record_booking_diversion(uuid, text, text, text, text, timestamptz, boolean, boolean, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_booking_diversion(uuid, text, text, text, text, timestamptz, boolean, boolean, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.passenger_audit_event(uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_compliance_audit(uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.passenger_compliance_requirements(target_passenger_id uuid)
RETURNS TABLE (document_type text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE passenger_row public.passengers;
BEGIN
  SELECT * INTO passenger_row FROM public.passengers WHERE id = target_passenger_id;
  IF passenger_row.id IS NULL OR NOT public.can_access_passenger_request(passenger_row.request_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT 'GOVERNMENT_PHOTO_ID'::text
    UNION ALL SELECT 'PASSPORT' WHERE passenger_row.is_foreign_national
    UNION ALL SELECT 'VISA' WHERE passenger_row.visa_required
    UNION ALL SELECT 'GUARDIAN_CONSENT' WHERE passenger_row.passenger_type = 'UNACCOMPANIED_MINOR'
    UNION ALL SELECT 'MEDICAL_FITNESS_CERTIFICATE' WHERE passenger_row.medical_fitness_required;
END;
$$;
REVOKE ALL ON FUNCTION public.passenger_compliance_requirements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.passenger_compliance_requirements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_passenger_original_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.original_document_seen IS DISTINCT FROM OLD.original_document_seen THEN
    PERFORM public.passenger_audit_event(
      NEW.request_id, NEW.passenger_id, NEW.id,
      CASE WHEN NEW.original_document_seen THEN 'ORIGINAL_DOCUMENT_PHYSICALLY_VERIFIED' ELSE 'ORIGINAL_DOCUMENT_VERIFICATION_REVOKED' END,
      CASE WHEN NEW.original_document_seen THEN 'Staff recorded that the original physical document was seen' ELSE 'Original physical-document verification was revoked' END,
      jsonb_build_object('document_type', NEW.document_type,
        'previous_value', OLD.original_document_seen, 'new_value', NEW.original_document_seen,
        'verified_by', NEW.original_verified_by, 'verification_notes', NEW.verification_notes)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS passenger_original_document_audit_trigger ON public.passenger_documents;
CREATE TRIGGER passenger_original_document_audit_trigger AFTER UPDATE OF original_document_seen
ON public.passenger_documents FOR EACH ROW EXECUTE FUNCTION public.audit_passenger_original_document_change();

CREATE OR REPLACE FUNCTION public.set_passenger_original_verifier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.original_document_seen IS DISTINCT FROM OLD.original_document_seen THEN
    IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN
      RAISE EXCEPTION 'Only authorized staff can verify a physical original';
    END IF;
    IF NEW.original_document_seen THEN
      NEW.original_verified_by := auth.uid();
      NEW.original_verified_at := now();
    ELSE
      NEW.original_verified_by := NULL;
      NEW.original_verified_at := NULL;
    END IF;
  ELSE
    NEW.original_verified_by := OLD.original_verified_by;
    NEW.original_verified_at := OLD.original_verified_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS passenger_original_verifier_trigger ON public.passenger_documents;
CREATE TRIGGER passenger_original_verifier_trigger BEFORE UPDATE ON public.passenger_documents
FOR EACH ROW EXECUTE FUNCTION public.set_passenger_original_verifier();

DROP POLICY IF EXISTS passenger_documents_storage_delete ON storage.objects;
CREATE POLICY passenger_documents_storage_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'passenger-documents'
  AND (
    public.is_role('ADMIN')
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND NOT EXISTS (SELECT 1 FROM public.passenger_documents d WHERE d.storage_path = name)
    )
  )
);

DROP POLICY IF EXISTS aircraft_operational_config_select ON public.aircraft_operational_config;
CREATE POLICY aircraft_operational_config_select ON public.aircraft_operational_config FOR SELECT USING (
  public.is_role('SALES') OR public.is_role('ADMIN')
);

CREATE OR REPLACE FUNCTION public.audit_booking_record_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.booking_compliance_audit(
    NEW.id, NULL, NULL,
    CASE WHEN TG_OP = 'INSERT' THEN 'BOOKING_CONFIRMED_PNR_ASSIGNED' ELSE 'BOOKING_OPERATIONAL_DATA_UPDATED' END,
    CASE WHEN TG_OP = 'INSERT' THEN 'Confirmed booking and unique PNR created' ELSE 'Booking sector or operation policy updated' END,
    jsonb_build_object('previous', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      'new', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_record_audit_trigger ON public.booking_records;
CREATE TRIGGER booking_record_audit_trigger AFTER INSERT OR UPDATE ON public.booking_records
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_record_change();

CREATE OR REPLACE FUNCTION public.booking_sector(target_booking_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result text; linked_request_id uuid;
BEGIN
  SELECT request_id INTO linked_request_id
  FROM public.booking_records WHERE id = target_booking_id;
  IF linked_request_id IS NULL OR NOT public.can_access_passenger_request(linked_request_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT CASE WHEN departure IS NULL AND destination IS NULL THEN NULL
    ELSE COALESCE(departure, 'TBC') || ' -> ' || COALESCE(destination, 'TBC') END
  INTO result FROM public.booking_records WHERE id = target_booking_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.booking_sector(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_sector(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_booking_for_request(target_request_id uuid)
RETURNS public.booking_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.booking_records; request_row public.requests; new_pnr text;
BEGIN
  SELECT * INTO request_row FROM public.requests WHERE id = target_request_id;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF request_row.status <> 'BOOKED' THEN RAISE EXCEPTION 'Only booked requests can receive a PNR'; END IF;
  IF NOT (request_row.customer_id = auth.uid() OR public.is_role('SALES') OR public.is_role('ADMIN')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO result FROM public.booking_records WHERE request_id = target_request_id;
  IF result.id IS NOT NULL THEN RETURN result; END IF;

  LOOP
    new_pnr := 'HJ' || upper(encode(gen_random_bytes(5), 'hex'));
    BEGIN
      INSERT INTO public.booking_records (
        request_id, pnr, travel_date, departure, destination, aircraft_kind, aircraft_model
      ) VALUES (
        request_row.id, new_pnr, request_row.start_date, request_row.departure,
        request_row.destination, request_row.service_details->>'aircraft_kind',
        request_row.service_details->>'aircraft_model'
      ) ON CONFLICT (request_id) DO NOTHING RETURNING * INTO result;
      IF result.id IS NOT NULL THEN EXIT; END IF;
    EXCEPTION WHEN unique_violation THEN
      result := NULL;
    END;
    SELECT * INTO result FROM public.booking_records WHERE request_id = target_request_id;
    IF result.id IS NOT NULL THEN EXIT; END IF;
  END LOOP;

  UPDATE public.passengers
  SET booking_id = result.id, pnr = result.pnr,
      sector = CASE WHEN result.departure IS NULL AND result.destination IS NULL THEN NULL
                    ELSE COALESCE(result.departure, 'TBC') || ' -> ' || COALESCE(result.destination, 'TBC') END
  WHERE request_id = target_request_id
    AND (booking_id IS DISTINCT FROM result.id OR pnr IS DISTINCT FROM result.pnr);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking_for_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_for_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_passenger_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE booking_row public.booking_records;
BEGIN
  SELECT * INTO booking_row FROM public.booking_records WHERE request_id = NEW.request_id;
  IF booking_row.id IS NOT NULL THEN
    NEW.booking_id := booking_row.id;
    NEW.pnr := booking_row.pnr;
    NEW.sector := CASE WHEN booking_row.departure IS NULL AND booking_row.destination IS NULL THEN NULL
      ELSE COALESCE(booking_row.departure, 'TBC') || ' -> ' || COALESCE(booking_row.destination, 'TBC') END;
  ELSE
    NEW.booking_id := NULL;
    NEW.pnr := NULL;
    NEW.sector := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_booking_to_passengers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.passengers
  SET pnr = NEW.pnr,
      sector = CASE WHEN NEW.departure IS NULL AND NEW.destination IS NULL THEN NULL
        ELSE COALESCE(NEW.departure, 'TBC') || ' -> ' || COALESCE(NEW.destination, 'TBC') END
  WHERE booking_id = NEW.id
    AND (pnr IS DISTINCT FROM NEW.pnr OR sector IS DISTINCT FROM CASE WHEN NEW.departure IS NULL AND NEW.destination IS NULL THEN NULL
      ELSE COALESCE(NEW.departure, 'TBC') || ' -> ' || COALESCE(NEW.destination, 'TBC') END);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_passenger_sync_trigger ON public.booking_records;
CREATE TRIGGER booking_passenger_sync_trigger AFTER UPDATE OF pnr, departure, destination ON public.booking_records
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_to_passengers();

CREATE OR REPLACE FUNCTION public.sync_request_to_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.booking_records
  SET travel_date = NEW.start_date,
      departure = NEW.departure,
      destination = NEW.destination,
      aircraft_kind = NEW.service_details->>'aircraft_kind',
      aircraft_model = NEW.service_details->>'aircraft_model',
      updated_at = now()
  WHERE request_id = NEW.id
    AND (travel_date IS DISTINCT FROM NEW.start_date OR departure IS DISTINCT FROM NEW.departure
      OR destination IS DISTINCT FROM NEW.destination
      OR aircraft_kind IS DISTINCT FROM NEW.service_details->>'aircraft_kind'
      OR aircraft_model IS DISTINCT FROM NEW.service_details->>'aircraft_model');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS request_booking_data_sync_trigger ON public.requests;
CREATE TRIGGER request_booking_data_sync_trigger AFTER UPDATE OF start_date, departure, destination, service_details ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_to_booking();

CREATE OR REPLACE FUNCTION public.issue_passenger_ticket(target_passenger_id uuid)
RETURNS public.booking_tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE passenger_row public.passengers; booking_row public.booking_records; result public.booking_tickets;
  linked_request public.requests; declaration_row public.passenger_weight_declarations;
  checkin_row public.passenger_checkins; weighing_row public.physical_weighings; sector_value text;
BEGIN
  SELECT * INTO passenger_row FROM public.passengers WHERE id = target_passenger_id AND status = 'ACTIVE';
  IF passenger_row.id IS NULL THEN RAISE EXCEPTION 'Passenger not found'; END IF;
  SELECT * INTO booking_row FROM public.booking_records WHERE id = passenger_row.booking_id AND booking_status = 'CONFIRMED';
  IF booking_row.id IS NULL THEN RAISE EXCEPTION 'Confirmed booking not found'; END IF;
  SELECT * INTO linked_request FROM public.requests WHERE id = booking_row.request_id;
  IF NOT (linked_request.customer_id = auth.uid() OR public.is_role('SALES') OR public.is_role('ADMIN')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO result FROM public.booking_tickets
  WHERE booking_id = booking_row.id AND passenger_id = passenger_row.id AND ticket_status = 'ISSUED';
  IF result.id IS NOT NULL THEN RETURN result; END IF;

  SELECT * INTO declaration_row FROM public.passenger_weight_declarations
  WHERE booking_id = booking_row.id AND passenger_id = passenger_row.id;
  SELECT * INTO checkin_row FROM public.passenger_checkins
  WHERE booking_id = booking_row.id AND passenger_id = passenger_row.id;
  SELECT * INTO weighing_row FROM public.physical_weighings
  WHERE booking_id = booking_row.id AND passenger_id = passenger_row.id
  ORDER BY performed_at DESC LIMIT 1;
  sector_value := CASE WHEN booking_row.departure IS NULL AND booking_row.destination IS NULL THEN NULL
    ELSE COALESCE(booking_row.departure, 'TBC') || ' -> ' || COALESCE(booking_row.destination, 'TBC') END;

  INSERT INTO public.booking_tickets (
    booking_id, passenger_id, ticket_number, passenger_name, sector, ticket_data, generated_by
  ) VALUES (
    booking_row.id, passenger_row.id,
    'ET-' || booking_row.pnr || '-' || upper(substr(replace(passenger_row.id::text, '-', ''), 1, 6)),
    passenger_row.full_legal_name, sector_value,
    jsonb_build_object(
      'operator', 'HELITEJET', 'pnr', booking_row.pnr,
      'passenger_name', passenger_row.full_legal_name, 'sector', sector_value,
      'booking_date', booking_row.booking_date, 'travel_date', booking_row.travel_date,
      'departure', booking_row.departure, 'destination', booking_row.destination,
      'passenger_status', passenger_row.status,
      'body_weight_declaration_status', CASE WHEN declaration_row.body_weight_confirmed THEN 'DECLARED' ELSE 'REQUIRED' END,
      'hand_baggage_declaration_status', CASE WHEN declaration_row.hand_baggage_confirmed THEN 'DECLARED' ELSE 'REQUIRED' END,
      'physical_weighing_status', CASE WHEN weighing_row.verified THEN 'VERIFIED' ELSE 'PENDING' END,
      'baggage_restriction', 'Hand baggage only unless the operator confirms an aircraft-specific compartment and limit.',
      'checkin_status', COALESCE(checkin_row.checkin_status, 'PENDING')
    ), auth.uid()
  ) RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(booking_row.id, passenger_row.id, NULL, 'E_TICKET_ISSUED', 'Passenger e-ticket issued', jsonb_build_object('ticket_number', result.ticket_number, 'pnr', booking_row.pnr));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_passenger_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_passenger_ticket(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_ticket_for_confirmed_passenger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL THEN PERFORM public.issue_passenger_ticket(NEW.id); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS passenger_ticket_auto_issue_trigger ON public.passengers;
CREATE TRIGGER passenger_ticket_auto_issue_trigger AFTER INSERT OR UPDATE OF booking_id ON public.passengers
FOR EACH ROW EXECUTE FUNCTION public.issue_ticket_for_confirmed_passenger();

CREATE OR REPLACE FUNCTION public.compare_passenger_ticket_name(target_passenger_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE current_name text; issued_name text; linked_request_id uuid;
BEGIN
  SELECT p.full_legal_name, p.request_id INTO current_name, linked_request_id
  FROM public.passengers p WHERE p.id = target_passenger_id;
  IF linked_request_id IS NULL OR NOT public.can_access_passenger_request(linked_request_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT passenger_name INTO issued_name FROM public.booking_tickets
  WHERE passenger_id = target_passenger_id AND ticket_status = 'ISSUED'
  ORDER BY generated_at DESC LIMIT 1;
  IF issued_name IS NULL THEN RETURN 'PENDING'; END IF;
  IF upper(regexp_replace(current_name, '[^A-Z0-9]', '', 'gi')) = upper(regexp_replace(issued_name, '[^A-Z0-9]', '', 'gi')) THEN RETURN 'VERIFIED'; END IF;
  RETURN 'MISMATCH';
END;
$$;
REVOKE ALL ON FUNCTION public.compare_passenger_ticket_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compare_passenger_ticket_name(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_booking_photography_policy(target_booking_id uuid, target_applicable boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_value boolean; request_id_value uuid; new_value boolean;
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN RAISE EXCEPTION 'Only operational staff can set briefing policy'; END IF;
  SELECT photography_restrictions_applicable INTO old_value
  FROM public.booking_records WHERE id = target_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  UPDATE public.booking_records SET photography_restrictions_applicable = target_applicable, updated_at = now()
  WHERE id = target_booking_id RETURNING photography_restrictions_applicable, request_id INTO new_value, request_id_value;
  PERFORM public.passenger_audit_event(request_id_value, NULL, NULL, 'BRIEFING_POLICY_CHANGED', 'Photography and drone briefing applicability changed', jsonb_build_object('photography_restrictions_applicable', old_value));
END;
$$;
REVOKE ALL ON FUNCTION public.set_booking_photography_policy(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_booking_photography_policy(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_passenger_headset_provided(
  target_booking_id uuid, target_passenger_id uuid, target_provided boolean
)
RETURNS public.passenger_briefings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.passenger_briefings;
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN
    RAISE EXCEPTION 'Only operational staff can record headset issue';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_records WHERE id = target_booking_id AND booking_status = 'CONFIRMED')
    OR NOT EXISTS (SELECT 1 FROM public.passengers WHERE id = target_passenger_id AND booking_id = target_booking_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Passenger does not belong to confirmed booking';
  END IF;
  INSERT INTO public.passenger_briefings (booking_id, passenger_id, acknowledged_by, headset_provided)
  VALUES (target_booking_id, target_passenger_id, auth.uid(), target_provided)
  ON CONFLICT (booking_id, passenger_id) DO UPDATE SET
    headset_provided = target_provided, updated_at = now()
  RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(target_booking_id, target_passenger_id, NULL,
    'HEADSET_HEARING_PROTECTION_ISSUED', 'Staff recorded headset/hearing-protection issue state',
    jsonb_build_object('previous', NOT target_provided, 'new', target_provided));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_passenger_headset_provided(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_passenger_headset_provided(uuid, uuid, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.save_passenger_weight_declaration(uuid, uuid, numeric, numeric);
CREATE OR REPLACE FUNCTION public.save_passenger_weight_declaration(
  target_booking_id uuid, target_passenger_id uuid, target_body_weight_kg numeric,
  target_hand_baggage_weight_kg numeric, target_signature_name text,
  target_body_confirmed boolean, target_baggage_confirmed boolean
)
RETURNS public.passenger_weight_declarations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.passenger_weight_declarations; previous_row public.passenger_weight_declarations;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.booking_records b JOIN public.requests r ON r.id = b.request_id
    WHERE b.id = target_booking_id AND r.customer_id = auth.uid() AND b.booking_status = 'CONFIRMED') THEN
    RAISE EXCEPTION 'Not authorized for this confirmed booking';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.passengers WHERE id = target_passenger_id AND booking_id = target_booking_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Passenger does not belong to booking';
  END IF;
  IF target_body_weight_kg <= 0 OR target_body_weight_kg > 500 OR target_hand_baggage_weight_kg < 0 OR target_hand_baggage_weight_kg > 200 THEN
    RAISE EXCEPTION 'Weight values are outside accepted data-entry bounds';
  END IF;
  IF NOT target_body_confirmed OR NOT target_baggage_confirmed OR length(trim(target_signature_name)) < 2 THEN
    RAISE EXCEPTION 'Both declarations and typed-name consent are required';
  END IF;
  SELECT * INTO previous_row FROM public.passenger_weight_declarations
    WHERE booking_id = target_booking_id AND passenger_id = target_passenger_id;
  INSERT INTO public.passenger_weight_declarations (
    booking_id, passenger_id, body_weight_kg, hand_baggage_weight_kg,
    body_weight_confirmed, hand_baggage_confirmed, consent_text, signature_name, declared_by
  ) VALUES (
    target_booking_id, target_passenger_id, target_body_weight_kg, target_hand_baggage_weight_kg,
    true, true, 'I confirm that the declared passenger and hand-baggage weights are accurate.', trim(target_signature_name), auth.uid()
  ) ON CONFLICT (booking_id, passenger_id) DO UPDATE SET
    body_weight_kg = excluded.body_weight_kg,
    hand_baggage_weight_kg = excluded.hand_baggage_weight_kg,
    body_weight_confirmed = true,
    hand_baggage_confirmed = true,
    consent_text = excluded.consent_text,
    signature_name = excluded.signature_name,
    declared_by = auth.uid(), declared_at = now(), updated_at = now()
  RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(target_booking_id, target_passenger_id, NULL,
    CASE WHEN previous_row.id IS NULL THEN 'WEIGHT_DECLARATION_SUBMITTED' ELSE 'WEIGHT_DECLARATION_UPDATED' END,
    'Passenger body and hand-baggage weights declared',
    jsonb_build_object('previous_body_weight_kg', previous_row.body_weight_kg,
      'previous_hand_baggage_weight_kg', previous_row.hand_baggage_weight_kg,
      'body_weight_kg', result.body_weight_kg,
      'hand_baggage_weight_kg', result.hand_baggage_weight_kg,
      'signature_name', result.signature_name));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_passenger_weight_declaration(uuid, uuid, numeric, numeric, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_passenger_weight_declaration(uuid, uuid, numeric, numeric, text, boolean, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.save_passenger_briefing(uuid, uuid, boolean);
CREATE OR REPLACE FUNCTION public.save_passenger_briefing(
  target_booking_id uuid, target_passenger_id uuid, target_items jsonb
)
RETURNS public.passenger_briefings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.passenger_briefings; previous_row public.passenger_briefings; photography_required boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.booking_records b JOIN public.requests r ON r.id = b.request_id
    WHERE b.id = target_booking_id AND r.customer_id = auth.uid() AND b.booking_status = 'CONFIRMED') THEN
    RAISE EXCEPTION 'Not authorized for this confirmed booking';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.passengers WHERE id = target_passenger_id AND booking_id = target_booking_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Passenger does not belong to booking';
  END IF;
  SELECT photography_restrictions_applicable INTO photography_required
    FROM public.booking_records WHERE id = target_booking_id;
  IF jsonb_typeof(target_items) <> 'object'
    OR COALESCE((target_items->>'seatbelt_harness_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'headset_hearing_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'emergency_exits_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'brace_position_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'no_smoking_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'rotor_loose_item_safety_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'no_standing_rotor_operation_acknowledged')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'weight_baggage_confirmed')::boolean, false) IS NOT TRUE
    OR COALESCE((target_items->>'diversion_delay_acknowledged')::boolean, false) IS NOT TRUE
    OR (photography_required AND COALESCE((target_items->>'photography_drone_acknowledged')::boolean, false) IS NOT TRUE) THEN
    RAISE EXCEPTION 'All applicable briefing acknowledgements are required';
  END IF;
  SELECT * INTO previous_row FROM public.passenger_briefings
    WHERE booking_id = target_booking_id AND passenger_id = target_passenger_id;
  INSERT INTO public.passenger_briefings (
    booking_id, passenger_id, seatbelt_harness_acknowledged, headset_hearing_acknowledged,
    emergency_exits_acknowledged, brace_position_acknowledged, no_smoking_acknowledged,
    rotor_loose_item_safety_acknowledged, no_standing_rotor_operation_acknowledged,
    weight_baggage_confirmed, photography_drone_acknowledged, diversion_delay_acknowledged,
    photography_restrictions_applicable, acknowledged_by
  ) VALUES (
    target_booking_id, target_passenger_id, true, true, true, true, true, true, true, true,
    COALESCE((target_items->>'photography_drone_acknowledged')::boolean, false), true,
    photography_required, auth.uid()
  ) ON CONFLICT (booking_id, passenger_id) DO UPDATE SET
    seatbelt_harness_acknowledged = true, headset_hearing_acknowledged = true,
    emergency_exits_acknowledged = true, brace_position_acknowledged = true,
    no_smoking_acknowledged = true, rotor_loose_item_safety_acknowledged = true,
    no_standing_rotor_operation_acknowledged = true, weight_baggage_confirmed = true,
    photography_drone_acknowledged = excluded.photography_drone_acknowledged,
    diversion_delay_acknowledged = true,
    photography_restrictions_applicable = photography_required,
    acknowledged_by = auth.uid(), acknowledged_at = now(), updated_at = now()
  RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(target_booking_id, target_passenger_id, NULL,
    CASE WHEN previous_row.id IS NULL THEN 'PASSENGER_BRIEFING_ACKNOWLEDGED' ELSE 'PASSENGER_BRIEFING_UPDATED' END,
    'Passenger briefing acknowledged', jsonb_build_object('previous', to_jsonb(previous_row), 'new', to_jsonb(result)));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_passenger_briefing(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_passenger_briefing(uuid, uuid, jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.record_physical_weighing(uuid, uuid, numeric, numeric, boolean, text);
CREATE OR REPLACE FUNCTION public.record_physical_weighing(
  target_booking_id uuid, target_passenger_id uuid, target_body_weight_kg numeric,
  target_hand_baggage_weight_kg numeric, target_verified boolean, target_notes text
)
RETURNS public.physical_weighings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.physical_weighings; declaration_id uuid;
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN RAISE EXCEPTION 'Only operational staff can record physical weighing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_records WHERE id = target_booking_id AND booking_status = 'CONFIRMED')
    OR NOT EXISTS (SELECT 1 FROM public.passengers WHERE id = target_passenger_id AND booking_id = target_booking_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Passenger does not belong to confirmed booking';
  END IF;
  IF target_body_weight_kg <= 0 OR target_body_weight_kg > 500 OR target_hand_baggage_weight_kg < 0 OR target_hand_baggage_weight_kg > 200 THEN
    RAISE EXCEPTION 'Measured weights are outside accepted data-entry bounds';
  END IF;
  SELECT id INTO declaration_id FROM public.passenger_weight_declarations WHERE booking_id = target_booking_id AND passenger_id = target_passenger_id;
  INSERT INTO public.physical_weighings (
    booking_id, passenger_id, declared_weight_declaration_id, measured_body_weight_kg,
    measured_hand_baggage_weight_kg, verified, performed_by, notes
  ) VALUES (
    target_booking_id, target_passenger_id, declaration_id, target_body_weight_kg,
    target_hand_baggage_weight_kg, target_verified, auth.uid(), target_notes
  ) RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(target_booking_id, target_passenger_id, NULL,
    'PHYSICAL_WEIGHING_RECORDED', 'Physical passenger and hand-baggage weighing recorded',
    jsonb_build_object('body_weight_kg', target_body_weight_kg,
      'hand_baggage_weight_kg', target_hand_baggage_weight_kg, 'verified', target_verified, 'notes', target_notes));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.record_physical_weighing(uuid, uuid, numeric, numeric, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_physical_weighing(uuid, uuid, numeric, numeric, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_booking_weight_balance(target_booking_id uuid)
RETURNS public.weight_balance_calculations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.weight_balance_calculations; booking_row public.booking_records; config_row public.aircraft_operational_config;
  passenger_total numeric := 0; baggage_total numeric := 0; missing_count integer := 0;
  load_total numeric; calc_status text; notes text;
BEGIN
  SELECT * INTO booking_row FROM public.booking_records WHERE id = target_booking_id;
  IF booking_row.id IS NULL OR NOT public.can_access_passenger_request(booking_row.request_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO config_row FROM public.aircraft_operational_config
    WHERE aircraft_kind = booking_row.aircraft_kind AND aircraft_model = booking_row.aircraft_model;
  SELECT COALESCE(SUM(latest.measured_body_weight_kg), 0),
    COALESCE(SUM(latest.measured_hand_baggage_weight_kg), 0),
    COUNT(*) FILTER (WHERE latest.verified IS DISTINCT FROM true)
  INTO passenger_total, baggage_total, missing_count
  FROM public.passengers p
  LEFT JOIN LATERAL (
    SELECT w.measured_body_weight_kg, w.measured_hand_baggage_weight_kg, w.verified
    FROM public.physical_weighings w
    WHERE w.booking_id = target_booking_id AND w.passenger_id = p.id
    ORDER BY w.performed_at DESC LIMIT 1
  ) latest ON true
  WHERE p.booking_id = target_booking_id AND p.status = 'ACTIVE';
  load_total := passenger_total + baggage_total;
  IF config_row.id IS NULL OR missing_count > 0 THEN
    calc_status := 'INCOMPLETE';
    notes := 'Aircraft configuration or latest verified physical weighing is missing.';
  ELSIF (config_row.maximum_payload_kg IS NOT NULL AND load_total > config_row.maximum_payload_kg)
    OR (config_row.baggage_capacity_kg IS NOT NULL AND baggage_total > config_row.baggage_capacity_kg) THEN
    calc_status := 'OVER_LIMIT';
    notes := 'Passenger and hand-baggage subtotal exceeds a configured aircraft limit. Other load components remain unmodeled.';
  ELSE
    calc_status := 'INCOMPLETE';
    notes := 'Passenger and hand-baggage subtotal only. Additional cargo, catering, fuel/load stations, and aircraft-specific balance data are not modeled; this is not a complete operational weight-and-balance release.';
  END IF;
  INSERT INTO public.weight_balance_calculations (
    booking_id, aircraft_config_id, total_passenger_weight_kg, total_baggage_weight_kg,
    total_additional_load_kg, applicable_payload_limit_kg, remaining_capacity_kg,
    calculation_status, calculation_notes, calculated_by
  ) VALUES (
    target_booking_id, config_row.id, passenger_total, baggage_total, 0,
    config_row.maximum_payload_kg,
    CASE WHEN config_row.maximum_payload_kg IS NULL THEN NULL ELSE config_row.maximum_payload_kg - load_total END,
    calc_status, notes, auth.uid()
  ) ON CONFLICT (booking_id) DO UPDATE SET
    aircraft_config_id = excluded.aircraft_config_id,
    total_passenger_weight_kg = excluded.total_passenger_weight_kg,
    total_baggage_weight_kg = excluded.total_baggage_weight_kg,
    applicable_payload_limit_kg = excluded.applicable_payload_limit_kg,
    remaining_capacity_kg = excluded.remaining_capacity_kg,
    calculation_status = excluded.calculation_status,
    calculation_notes = excluded.calculation_notes,
    calculated_by = excluded.calculated_by, calculated_at = now(), updated_at = now()
  RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(target_booking_id, NULL, NULL,
    'WEIGHT_BALANCE_CALCULATED', 'Passenger and hand-baggage subtotal calculated',
    jsonb_build_object('status', result.calculation_status, 'passenger_kg', passenger_total,
      'hand_baggage_kg', baggage_total, 'configured_limit_kg', config_row.maximum_payload_kg));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.calculate_booking_weight_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_booking_weight_balance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_passenger_ticket_name(
  target_passenger_id uuid, target_resolution text, target_notes text
)
RETURNS public.passenger_checkins LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE passenger_row public.passengers; booking_row public.booking_records; result public.passenger_checkins; raw_status text;
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN RAISE EXCEPTION 'Only operational staff can review ticket-name discrepancies'; END IF;
  IF target_resolution NOT IN ('VERIFIED', 'REQUIRES_REVIEW') OR length(trim(target_notes)) < 3 THEN
    RAISE EXCEPTION 'A valid review resolution and notes are required';
  END IF;
  SELECT * INTO passenger_row FROM public.passengers WHERE id = target_passenger_id AND status = 'ACTIVE';
  SELECT * INTO booking_row FROM public.booking_records WHERE id = passenger_row.booking_id;
  IF passenger_row.id IS NULL OR booking_row.id IS NULL THEN RAISE EXCEPTION 'Passenger booking not found'; END IF;
  raw_status := public.compare_passenger_ticket_name(target_passenger_id);
  IF raw_status = 'PENDING' THEN RAISE EXCEPTION 'An issued ticket is required before name review'; END IF;
  INSERT INTO public.passenger_checkins (
    booking_id, passenger_id, name_match_status, name_reviewed_by, name_reviewed_at, name_review_notes
  ) VALUES (
    booking_row.id, passenger_row.id, target_resolution, auth.uid(), now(), trim(target_notes)
  ) ON CONFLICT (booking_id, passenger_id) DO UPDATE SET
    name_match_status = excluded.name_match_status, name_reviewed_by = auth.uid(),
    name_reviewed_at = now(), name_review_notes = trim(target_notes), updated_at = now()
  RETURNING * INTO result;
  PERFORM public.booking_compliance_audit(booking_row.id, passenger_row.id, NULL,
    'PASSENGER_TICKET_NAME_REVIEWED', 'Passenger identity compared with issued ticket',
    jsonb_build_object('automated_result', raw_status, 'staff_resolution', target_resolution, 'notes', target_notes));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.review_passenger_ticket_name(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_passenger_ticket_name(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_passenger_checkin(target_passenger_id uuid)
RETURNS public.passenger_checkins LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE passenger_row public.passengers; booking_row public.booking_records; declaration_row public.passenger_weight_declarations;
  weighing_row public.physical_weighings; briefing_row public.passenger_briefings; checkin_row public.passenger_checkins;
  raw_name_status text; name_status text; original_ok boolean; required_documents_ok boolean;
  weight_ok boolean; briefing_ok boolean; blocking_reasons text[] := ARRAY[]::text[];
BEGIN
  IF NOT (public.is_role('SALES') OR public.is_role('ADMIN')) THEN RAISE EXCEPTION 'Only operational staff can complete check-in'; END IF;
  SELECT * INTO passenger_row FROM public.passengers WHERE id = target_passenger_id AND status = 'ACTIVE';
  IF passenger_row.id IS NULL THEN RAISE EXCEPTION 'Passenger not found'; END IF;
  SELECT * INTO booking_row FROM public.booking_records WHERE id = passenger_row.booking_id AND booking_status = 'CONFIRMED';
  IF booking_row.id IS NULL THEN RAISE EXCEPTION 'Confirmed booking not found'; END IF;

  SELECT * INTO declaration_row FROM public.passenger_weight_declarations
    WHERE passenger_id = target_passenger_id AND booking_id = booking_row.id;
  SELECT * INTO weighing_row FROM public.physical_weighings
    WHERE passenger_id = target_passenger_id AND booking_id = booking_row.id
    ORDER BY performed_at DESC LIMIT 1;
  SELECT * INTO briefing_row FROM public.passenger_briefings
    WHERE passenger_id = target_passenger_id AND booking_id = booking_row.id;
  SELECT * INTO checkin_row FROM public.passenger_checkins
    WHERE passenger_id = target_passenger_id AND booking_id = booking_row.id;

  raw_name_status := public.compare_passenger_ticket_name(target_passenger_id);
  name_status := CASE
    WHEN checkin_row.name_reviewed_at IS NOT NULL THEN checkin_row.name_match_status
    WHEN raw_name_status = 'MISMATCH' THEN 'MISMATCH'
    ELSE 'PENDING'
  END;
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.passenger_compliance_requirements(target_passenger_id) required
    WHERE required.document_type IN ('GOVERNMENT_PHOTO_ID', 'PASSPORT')
      AND NOT EXISTS (
        SELECT 1 FROM public.passenger_documents d
        WHERE d.passenger_id = target_passenger_id
          AND d.document_type = required.document_type
          AND d.status = 'VERIFIED' AND d.original_document_seen
          AND (d.expiry_date IS NULL OR d.expiry_date >= current_date)
          AND NOT EXISTS (
            SELECT 1 FROM public.passenger_documents newer
            WHERE newer.passenger_id = d.passenger_id AND newer.document_type = d.document_type
              AND newer.uploaded_at > d.uploaded_at
          )
      )
  ) INTO original_ok;
  SELECT NOT EXISTS (
    SELECT 1 FROM public.passenger_compliance_requirements(target_passenger_id) required
    WHERE NOT EXISTS (
      SELECT 1 FROM public.passenger_documents d
      WHERE d.passenger_id = target_passenger_id AND d.document_type = required.document_type
        AND d.status = 'VERIFIED' AND (d.expiry_date IS NULL OR d.expiry_date >= current_date)
        AND NOT EXISTS (
          SELECT 1 FROM public.passenger_documents newer
          WHERE newer.passenger_id = d.passenger_id AND newer.document_type = d.document_type
            AND newer.uploaded_at > d.uploaded_at
        )
    )
  ) INTO required_documents_ok;
  weight_ok := declaration_row.id IS NOT NULL AND declaration_row.body_weight_confirmed
    AND declaration_row.hand_baggage_confirmed AND length(trim(declaration_row.signature_name)) >= 2
    AND weighing_row.id IS NOT NULL AND weighing_row.verified;
  briefing_ok := briefing_row.id IS NOT NULL
    AND briefing_row.seatbelt_harness_acknowledged AND briefing_row.headset_hearing_acknowledged
    AND briefing_row.emergency_exits_acknowledged AND briefing_row.brace_position_acknowledged
    AND briefing_row.no_smoking_acknowledged AND briefing_row.rotor_loose_item_safety_acknowledged
    AND briefing_row.no_standing_rotor_operation_acknowledged AND briefing_row.weight_baggage_confirmed
    AND briefing_row.diversion_delay_acknowledged
    AND (NOT booking_row.photography_restrictions_applicable OR briefing_row.photography_drone_acknowledged);

  IF raw_name_status = 'PENDING' THEN blocking_reasons := array_append(blocking_reasons, 'E-ticket is not issued'); END IF;
  IF name_status <> 'VERIFIED' THEN blocking_reasons := array_append(blocking_reasons, 'Staff comparison of original identity document against ticket is not verified'); END IF;
  IF NOT original_ok THEN blocking_reasons := array_append(blocking_reasons, 'Original government ID or passport has not been physically verified'); END IF;
  IF NOT required_documents_ok THEN blocking_reasons := array_append(blocking_reasons, 'Required verified passenger documents are incomplete or expired'); END IF;
  IF NOT weight_ok THEN blocking_reasons := array_append(blocking_reasons, 'Declared weights or latest verified physical weighing are incomplete'); END IF;
  IF NOT briefing_ok THEN blocking_reasons := array_append(blocking_reasons, 'Required passenger briefing is incomplete'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.weight_balance_calculations WHERE booking_id = booking_row.id AND calculation_status = 'VALID') THEN
    blocking_reasons := array_append(blocking_reasons, 'Complete operational weight-and-balance release is unavailable');
  END IF;

  INSERT INTO public.passenger_checkins (
    booking_id, passenger_id, name_match_status, original_document_verified,
    weight_verified, briefing_completed, checkin_status, checked_in_by, checked_in_at, notes
  ) VALUES (
    booking_row.id, passenger_row.id, name_status, original_ok, weight_ok, briefing_ok,
    CASE WHEN cardinality(blocking_reasons) = 0 THEN 'CLEARED'
      WHEN name_status IN ('MISMATCH', 'REQUIRES_REVIEW') THEN 'REQUIRES_REVIEW' ELSE 'BLOCKED' END,
    auth.uid(), now(), CASE WHEN cardinality(blocking_reasons) = 0 THEN 'All check-in gates complete.' ELSE array_to_string(blocking_reasons, '; ') END
  ) ON CONFLICT (booking_id, passenger_id) DO UPDATE SET
    name_match_status = excluded.name_match_status,
    original_document_verified = excluded.original_document_verified,
    weight_verified = excluded.weight_verified,
    briefing_completed = excluded.briefing_completed,
    checkin_status = excluded.checkin_status,
    checked_in_by = auth.uid(), checked_in_at = now(), notes = excluded.notes, updated_at = now()
  RETURNING * INTO checkin_row;
  PERFORM public.booking_compliance_audit(booking_row.id, passenger_row.id, NULL,
    'PASSENGER_CHECKIN_EVALUATED', 'Passenger check-in gates evaluated',
    jsonb_build_object('status', checkin_row.checkin_status, 'blocking_reasons', blocking_reasons));
  RETURN checkin_row;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_passenger_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_passenger_checkin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_booking_compliance_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_booking uuid; target_passenger uuid; event_name text; previous_data jsonb; new_data jsonb;
BEGIN
  target_booking := COALESCE(NEW.booking_id, OLD.booking_id);
  target_passenger := COALESCE(NEW.passenger_id, OLD.passenger_id);
  previous_data := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  event_name := TG_TABLE_NAME || '_' || lower(TG_OP);
  PERFORM public.booking_compliance_audit(target_booking, target_passenger, NULL,
    upper(event_name), 'Booking compliance record ' || lower(TG_OP),
    jsonb_build_object('previous', previous_data, 'new', new_data));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS weight_declaration_audit_trigger ON public.passenger_weight_declarations;
CREATE TRIGGER weight_declaration_audit_trigger AFTER INSERT OR UPDATE ON public.passenger_weight_declarations
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_compliance_row();
DROP TRIGGER IF EXISTS physical_weighing_audit_trigger ON public.physical_weighings;
CREATE TRIGGER physical_weighing_audit_trigger AFTER INSERT ON public.physical_weighings
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_compliance_row();
DROP TRIGGER IF EXISTS passenger_briefing_audit_trigger ON public.passenger_briefings;
CREATE TRIGGER passenger_briefing_audit_trigger AFTER INSERT OR UPDATE ON public.passenger_briefings
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_compliance_row();
DROP TRIGGER IF EXISTS passenger_checkin_audit_trigger ON public.passenger_checkins;
CREATE TRIGGER passenger_checkin_audit_trigger AFTER INSERT OR UPDATE ON public.passenger_checkins
FOR EACH ROW EXECUTE FUNCTION public.audit_booking_compliance_row();
