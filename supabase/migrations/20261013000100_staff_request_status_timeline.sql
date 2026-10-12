create or replace function public.set_staff_request_status(
  target_request_id uuid,
  target_status public.request_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or not (public.is_role('SALES') or public.is_role('ADMIN')) then
    raise exception 'Only Sales or Admin can update request status'
      using errcode = '42501';
  end if;

  update public.requests
  set status = target_status, updated_at = now()
  where id = target_request_id;
  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'Request not found';
  end if;

  insert into public.request_timeline (request_id, actor_id, event_type, message)
  values (
    target_request_id,
    auth.uid(),
    'STATUS_CHANGED',
    'Request status changed to ' || replace(target_status::text, '_', ' ') || '.'
  );
end;
$$;

revoke all on function public.set_staff_request_status(uuid, public.request_status)
  from public, anon;
grant execute on function public.set_staff_request_status(uuid, public.request_status)
  to authenticated;
