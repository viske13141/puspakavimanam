-- Restore execute grants that were revoked in 20260925000300 but are needed by customer-facing RPCs
GRANT EXECUTE ON FUNCTION public.passenger_audit_event(uuid, uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_compliance_audit(uuid, uuid, uuid, text, text, jsonb) TO authenticated;

-- Add a safe soft-delete RPC for passengers (customers can only remove their own passengers)
CREATE OR REPLACE FUNCTION public.remove_passenger(target_passenger_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE passenger_row public.passengers;
BEGIN
  SELECT * INTO passenger_row FROM public.passengers WHERE id = target_passenger_id AND status = 'ACTIVE';
  IF passenger_row.id IS NULL THEN RAISE EXCEPTION 'Passenger not found'; END IF;
  -- customers can only remove passengers on their own requests; staff can remove any
  IF NOT (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = passenger_row.request_id AND r.customer_id = auth.uid())
    OR public.is_role('SALES') OR public.is_role('ADMIN')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.passengers SET status = 'REMOVED', updated_at = now() WHERE id = target_passenger_id;
  PERFORM public.passenger_audit_event(
    passenger_row.request_id, target_passenger_id, NULL,
    'PASSENGER_REMOVED', 'Passenger removed from manifest', '{}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_passenger(uuid) TO authenticated;
