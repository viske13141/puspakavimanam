-- READ-ONLY staff account audit.
-- Run manually in the Supabase SQL Editor; this is not a migration.

-- 1. Operations/Operator profiles without the required row, or with an inactive row.
select
  p.id as profile_id,
  p.email as profile_email,
  p.full_name,
  p.role,
  case
    when p.role = 'OPERATIONS' then om.status
    when p.role = 'OPERATOR' then o.status
  end as membership_status,
  case
    when p.role = 'OPERATIONS' and om.id is null then 'MISSING_OPERATIONS_MEMBER'
    when p.role = 'OPERATOR' and o.id is null then 'MISSING_OPERATOR'
    when p.role = 'OPERATIONS' and om.status <> 'active' then 'OPERATIONS_NOT_ACTIVE'
    when p.role = 'OPERATOR' and o.status <> 'active' then 'OPERATOR_NOT_ACTIVE'
  end as finding
from public.profiles p
left join public.operations_members om on om.profile_id = p.id
left join public.operators o on o.profile_id = p.id
where p.role in ('OPERATIONS', 'OPERATOR')
  and (
    (p.role = 'OPERATIONS' and (om.id is null or om.status <> 'active'))
    or (p.role = 'OPERATOR' and (o.id is null or o.status <> 'active'))
  )
order by p.email;

-- 2. Sales profiles missing a Sales team row, or with mismatched email.
select
  p.id as profile_id,
  p.email as profile_email,
  sm.email as sales_member_email,
  case
    when sm.id is null then 'MISSING_SALES_MEMBER'
    when lower(p.email) <> lower(sm.email) then 'SALES_EMAIL_MISMATCH'
  end as finding
from public.profiles p
left join public.sales_members sm on sm.profile_id = p.id
where p.role = 'SALES'
  and (sm.id is null or lower(p.email) <> lower(sm.email))
order by p.email;

-- 3. Directory rows whose linked profile has the wrong role or a different email.
select
  'OPERATIONS' as directory_type,
  om.id as directory_id,
  om.profile_id,
  p.email as profile_email,
  om.email as directory_email,
  p.role as profile_role,
  om.status
from public.operations_members om
left join public.profiles p on p.id = om.profile_id
where p.id is null
   or p.role <> 'OPERATIONS'
   or lower(p.email) <> lower(om.email)
union all
select
  'OPERATOR' as directory_type,
  o.id as directory_id,
  o.profile_id,
  p.email as profile_email,
  o.email as directory_email,
  p.role as profile_role,
  o.status
from public.operators o
left join public.profiles p on p.id = o.profile_id
where p.id is null
   or p.role <> 'OPERATOR'
   or lower(p.email) <> lower(o.email)
order by directory_type, directory_email;

-- 4. Accounts registered in Auth but missing their public profile.
select
  u.id as auth_user_id,
  u.email as auth_email,
  u.created_at as auth_created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at desc;

-- MANUAL REPAIR TEMPLATE — leave commented until the identity and intended
-- role have been reviewed. Repair exactly one account at a time.
--
-- Replace the UUID and email below with values verified from the audit and
-- Auth dashboard. For an Operator, keep company_name empty if no company
-- name is known; the legacy NOT NULL column is retained for compatibility.
--
-- begin;
-- update public.profiles
-- set role = 'OPERATOR',
--     updated_at = now()
-- where id = 'REVIEWED-AUTH-USER-UUID'::uuid
--   and lower(email) = lower('REVIEWED-EMAIL')
--   and role = 'CUSTOMER'
--   and exists (
--     select 1 from auth.users u
--     where u.id = profiles.id
--       and lower(u.email) = lower('REVIEWED-EMAIL')
--   )
--   and not exists (
--     select 1 from public.operations_members om where om.profile_id = profiles.id
--   )
--   and not exists (
--     select 1 from public.operators o where o.profile_id = profiles.id
--   );
--
-- insert into public.operators (
--   profile_id, company_name, contact_person, email, status
-- )
-- select id, '', full_name, email, 'pending_verification'
-- from public.profiles
-- where id = 'REVIEWED-AUTH-USER-UUID'::uuid
--   and lower(email) = lower('REVIEWED-EMAIL')
--   and role = 'OPERATOR'
--   and not exists (
--     select 1 from public.operators o where o.profile_id = profiles.id
--   );
--
-- select p.id, p.email, p.role, o.status
-- from public.profiles p
-- join public.operators o on o.profile_id = p.id
-- where p.id = 'REVIEWED-AUTH-USER-UUID'::uuid;
-- commit;
--
-- For Operations, use the same verified predicates and transaction, set role
-- to 'OPERATIONS', then insert operations_members(profile_id, full_name, email,
-- status) with status 'active'. Do not activate an Operator until verification
-- is complete. A role with a missing Auth user cannot be repaired by these
-- statements; resolve it through the reviewed Auth provisioning process.
