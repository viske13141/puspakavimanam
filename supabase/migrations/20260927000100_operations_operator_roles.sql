-- ============================================================
-- Migration: Add OPERATIONS and OPERATOR roles
-- Safe: uses ALTER TYPE ... ADD VALUE IF NOT EXISTS (PG 14+)
-- Does NOT recreate existing tables or reset data.
-- ============================================================

-- 1. Extend the app_role enum
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'OPERATIONS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'OPERATOR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. operations_members table
CREATE TABLE IF NOT EXISTS public.operations_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name     text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  mobile        text,
  department    text,
  designation   text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  notes         text,
  created_by    uuid REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operations_members_profile_id_key ON public.operations_members(profile_id);
CREATE INDEX IF NOT EXISTS operations_members_email_idx ON public.operations_members(email);
CREATE INDEX IF NOT EXISTS operations_members_status_idx ON public.operations_members(status);

-- 3. operators table
CREATE TABLE IF NOT EXISTS public.operators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name    text NOT NULL DEFAULT '',
  contact_person  text NOT NULL DEFAULT '',
  email           text NOT NULL DEFAULT '',
  mobile          text,
  licence_number  text,
  aoc_number      text,
  service_type    text NOT NULL DEFAULT 'both' CHECK (service_type IN ('helicopter','private_jet','both')),
  company_address text,
  status          text NOT NULL DEFAULT 'pending_verification'
                  CHECK (status IN ('pending_verification','active','inactive','suspended','rejected')),
  notes           text,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operators_profile_id_key ON public.operators(profile_id);
CREATE INDEX IF NOT EXISTS operators_email_idx ON public.operators(email);
CREATE INDEX IF NOT EXISTS operators_status_idx ON public.operators(status);

-- 4. Enable RLS
ALTER TABLE public.operations_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

-- 5. RLS: operations_members
--    ADMIN can do everything; OPERATIONS member can read their own row.
DROP POLICY IF EXISTS ops_members_admin_all ON public.operations_members;
CREATE POLICY ops_members_admin_all ON public.operations_members
  FOR ALL USING (public.is_role('ADMIN'))
  WITH CHECK (public.is_role('ADMIN'));

DROP POLICY IF EXISTS ops_members_self_select ON public.operations_members;
CREATE POLICY ops_members_self_select ON public.operations_members
  FOR SELECT USING (profile_id = auth.uid());

-- 6. RLS: operators
--    ADMIN can do everything; OPERATOR can read their own row.
DROP POLICY IF EXISTS operators_admin_all ON public.operators;
CREATE POLICY operators_admin_all ON public.operators
  FOR ALL USING (public.is_role('ADMIN'))
  WITH CHECK (public.is_role('ADMIN'));

DROP POLICY IF EXISTS operators_self_select ON public.operators;
CREATE POLICY operators_self_select ON public.operators
  FOR SELECT USING (profile_id = auth.uid());

-- 7. Extend profiles_self_select to include OPERATIONS and OPERATOR visibility
--    (ADMIN already sees all via is_role check; this adds OPERATIONS/OPERATOR self-read)
--    The existing policy already covers id = auth.uid() so no change needed there.

-- 8. Security-definer helper: is_role already handles any app_role value generically,
--    so OPERATIONS and OPERATOR work automatically once enum values exist.

-- 9. Audit helper: insert_audit_event (no-op if audit table doesn't exist yet)
CREATE OR REPLACE FUNCTION public.log_staff_creation(
  p_actor_id   uuid,
  p_target_id  uuid,
  p_role       text,
  p_email      text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Insert into request_timeline as a generic audit event if available
  -- Credentials are never logged — only role and masked email
  INSERT INTO public.request_timeline (request_id, actor_id, event_type, message)
  SELECT gen_random_uuid(), p_actor_id, 'STAFF_CREATED',
    'Created ' || p_role || ' account for ' || left(p_email, 3) || '***'
  WHERE FALSE; -- placeholder; replace with actual audit table insert when available
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_staff_creation(uuid, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_staff_creation(uuid, uuid, text, text) TO service_role;
