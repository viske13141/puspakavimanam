-- Apply AFTER 20260927000100_operations_operator_roles.sql has committed.
-- Profile changes and directory edits must succeed or fail together.
CREATE OR REPLACE FUNCTION public.sync_managed_account_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Account identity cannot be changed through directory edits';
  END IF;
  IF TG_TABLE_NAME = 'operations_members' THEN
    UPDATE public.profiles SET full_name = NEW.full_name, mobile = NEW.mobile,
      updated_at = now() WHERE id = NEW.profile_id;
  ELSE
    UPDATE public.profiles SET full_name = NEW.contact_person, mobile = NEW.mobile,
      company = NEW.company_name, updated_at = now() WHERE id = NEW.profile_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account profile is missing'; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_managed_account_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_operations_profile ON public.operations_members;
CREATE TRIGGER sync_operations_profile BEFORE UPDATE ON public.operations_members
FOR EACH ROW EXECUTE FUNCTION public.sync_managed_account_profile();
DROP TRIGGER IF EXISTS sync_operator_profile ON public.operators;
CREATE TRIGGER sync_operator_profile BEFORE UPDATE ON public.operators
FOR EACH ROW EXECUTE FUNCTION public.sync_managed_account_profile();

-- Existing self-update policy must not allow a customer to grant themselves ADMIN.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Role changes require the account administration service';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations_members, public.operators TO authenticated, service_role;
