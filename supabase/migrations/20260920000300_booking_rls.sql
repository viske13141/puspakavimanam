-- RLS for booking_records
ALTER TABLE public.booking_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_records_customer_select ON public.booking_records;
CREATE POLICY booking_records_customer_select ON public.booking_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
    OR public.is_role('ADMIN') OR public.is_role('SALES')
  );

DROP POLICY IF EXISTS booking_records_staff_all ON public.booking_records;
CREATE POLICY booking_records_staff_all ON public.booking_records FOR ALL
  USING (public.is_role('ADMIN') OR public.is_role('SALES'))
  WITH CHECK (public.is_role('ADMIN') OR public.is_role('SALES'));

-- RLS for booking_tickets
ALTER TABLE public.booking_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_tickets_customer_select ON public.booking_tickets;
CREATE POLICY booking_tickets_customer_select ON public.booking_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_records br
      JOIN public.requests r ON r.id = br.request_id
      WHERE br.id = booking_id AND r.customer_id = auth.uid()
    )
    OR public.is_role('ADMIN') OR public.is_role('SALES')
  );

DROP POLICY IF EXISTS booking_tickets_staff_all ON public.booking_tickets;
CREATE POLICY booking_tickets_staff_all ON public.booking_tickets FOR ALL
  USING (public.is_role('ADMIN') OR public.is_role('SALES'))
  WITH CHECK (public.is_role('ADMIN') OR public.is_role('SALES'));

-- RLS for passenger_weight_declarations
ALTER TABLE public.passenger_weight_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pwd_customer_select ON public.passenger_weight_declarations;
CREATE POLICY pwd_customer_select ON public.passenger_weight_declarations FOR SELECT
  USING (declared_by = auth.uid() OR public.is_role('ADMIN') OR public.is_role('SALES'));

DROP POLICY IF EXISTS pwd_customer_insert ON public.passenger_weight_declarations;
CREATE POLICY pwd_customer_insert ON public.passenger_weight_declarations FOR INSERT
  WITH CHECK (declared_by = auth.uid());

DROP POLICY IF EXISTS pwd_staff_update ON public.passenger_weight_declarations;
CREATE POLICY pwd_staff_update ON public.passenger_weight_declarations FOR UPDATE
  USING (public.is_role('ADMIN') OR public.is_role('SALES'));

-- RLS for passenger_briefings
ALTER TABLE public.passenger_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pb_customer_select ON public.passenger_briefings;
CREATE POLICY pb_customer_select ON public.passenger_briefings FOR SELECT
  USING (acknowledged_by = auth.uid() OR public.is_role('ADMIN') OR public.is_role('SALES'));

DROP POLICY IF EXISTS pb_customer_insert ON public.passenger_briefings;
CREATE POLICY pb_customer_insert ON public.passenger_briefings FOR INSERT
  WITH CHECK (acknowledged_by = auth.uid());

DROP POLICY IF EXISTS pb_staff_update ON public.passenger_briefings;
CREATE POLICY pb_staff_update ON public.passenger_briefings FOR UPDATE
  USING (public.is_role('ADMIN') OR public.is_role('SALES'));

-- RLS for passenger_checkins
ALTER TABLE public.passenger_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_select ON public.passenger_checkins;
CREATE POLICY pc_select ON public.passenger_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_records br
      JOIN public.requests r ON r.id = br.request_id
      WHERE br.id = booking_id AND r.customer_id = auth.uid()
    )
    OR public.is_role('ADMIN') OR public.is_role('SALES')
  );

DROP POLICY IF EXISTS pc_staff_all ON public.passenger_checkins;
CREATE POLICY pc_staff_all ON public.passenger_checkins FOR ALL
  USING (public.is_role('ADMIN') OR public.is_role('SALES'))
  WITH CHECK (public.is_role('ADMIN') OR public.is_role('SALES'));
