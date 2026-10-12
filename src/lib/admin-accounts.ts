import { supabase } from "@/integrations/supabase/client";
import { invokeManagedAccountFunction } from "@/lib/managed-account.functions";

type ManagedAccountFunctionName =
  "create-operator-user" | "create-operations-user" | "create-sales-user" | "delete-managed-user";

/** Keep the administrator's browser session intact while managing another user's login. */
export async function invokeAccountFunction(
  name: ManagedAccountFunctionName,
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  return invokeManagedAccountFunction({ data: { accessToken, name, body } });
}
