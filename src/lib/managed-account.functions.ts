import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type AccountFunctionName =
  "create-operator-user" | "create-operations-user" | "create-sales-user" | "delete-managed-user";

type ManagedAccountRequest = {
  accessToken: string;
  name: AccountFunctionName;
  body: Record<string, unknown>;
};

function getSupabaseClients() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Account provisioning requires SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  const options = { auth: { autoRefreshToken: false, persistSession: false } };
  return {
    url,
    anonKey,
    authClient: createClient(url, anonKey, options),
    adminClient: createClient(url, serviceRoleKey, options),
  };
}

function text(body: Record<string, unknown>, key: string, maxLength = 500) {
  const value = body[key];
  if (typeof value !== "string") return "";
  if (value.trim().length > maxLength)
    throw new Error(`${key} must be ${maxLength} characters or fewer.`);
  return value.trim();
}

function password(body: Record<string, unknown>) {
  const value = body["password"];
  return typeof value === "string" ? value : "";
}

async function runManagedAccountFunction({ data }: { data: ManagedAccountRequest }) {
  const allowedNames = [
    "create-operator-user",
    "create-operations-user",
    "create-sales-user",
    "delete-managed-user",
  ];
  if (
    !data ||
    !allowedNames.includes(data.name) ||
    !data.body ||
    typeof data.body !== "object" ||
    Array.isArray(data.body)
  ) {
    throw new Error("Invalid managed account operation.");
  }
  if (typeof data.accessToken !== "string" || !data.accessToken || data.accessToken.length > 8192) {
    throw new Error("Your session is missing or expired. Sign in again.");
  }

  const { url, anonKey, authClient, adminClient } = getSupabaseClients();
  const { data: authData, error: authError } = await authClient.auth.getUser(data.accessToken);
  if (authError || !authData.user) {
    throw new Error("Your session is invalid or expired. Sign in again.");
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (callerError) throw new Error(`Unable to verify administrator access: ${callerError.message}`);
  if (callerProfile?.role !== "ADMIN") {
    throw new Error("Only administrators can manage staff accounts.");
  }

  if (data.name === "delete-managed-user") {
    const kind = text(data.body, "kind", 20);
    const id = text(data.body, "id", 64);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("A valid managed account id is required.");

    const table =
      kind === "operator" ? "operators" : kind === "operations" ? "operations_members" : null;
    if (!table) throw new Error("Choose a valid managed account type.");
    const { data: account, error: accountError } = await adminClient
      .from(table)
      .select("profile_id")
      .eq("id", id)
      .maybeSingle();
    if (accountError)
      throw new Error(`Unable to find the managed account: ${accountError.message}`);
    if (!account) throw new Error("The managed account was not found.");

    const { error } = await adminClient.auth.admin.deleteUser(account.profile_id);
    if (error) throw new Error(`Unable to delete the managed account: ${error.message}`);
    return { deleted: true, kind, id };
  }

  const role =
    data.name === "create-operator-user"
      ? "OPERATOR"
      : data.name === "create-operations-user"
        ? "OPERATIONS"
        : "SALES";
  const body = data.body;
  const email = text(body, "email", 320).toLowerCase();
  const userPassword = password(body);
  const fullName = text(body, "full_name", 160) || text(body, "contact_person", 160);
  const mobile = text(body, "mobile", 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (userPassword.length < 8 || userPassword.length > 1024) {
    throw new Error("Password must be between 8 and 1024 characters.");
  }
  if (fullName.length < 2) throw new Error("Enter a name with at least 2 characters.");
  if (
    role === "OPERATOR" &&
    !["helicopter", "private_jet", "both"].includes(text(body, "service_type", 30) || "both")
  ) {
    throw new Error("Choose a valid operator service type.");
  }
  const accountStatus = text(body, "status", 40);
  if (
    (role === "OPERATOR" &&
      accountStatus &&
      !["pending_verification", "active", "inactive", "suspended", "rejected"].includes(
        accountStatus,
      )) ||
    (role === "OPERATIONS" &&
      accountStatus &&
      !["active", "inactive", "suspended"].includes(accountStatus))
  ) {
    throw new Error("Choose a valid account status.");
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      mobile,
      company: text(body, "company_name", 200),
    },
  });
  if (createError) throw new Error(`Unable to create the login account: ${createError.message}`);
  const userId = created.user.id;

  try {
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .update({
        email,
        full_name: fullName,
        mobile: mobile || null,
        company: text(body, "company_name", 200) || null,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (profileError) throw new Error(`Unable to assign the account role: ${profileError.message}`);
    if (!profile)
      throw new Error("The new login account has no profile. Its creation was rolled back.");

    if (role === "OPERATOR") {
      const { error } = await adminClient.from("operators").insert({
        profile_id: userId,
        company_name: text(body, "company_name", 200),
        contact_person: fullName,
        email,
        mobile: mobile || null,
        licence_number: text(body, "licence_number", 120) || null,
        aoc_number: text(body, "aoc_number", 120) || null,
        service_type: text(body, "service_type", 30) || "both",
        company_address: text(body, "company_address", 1000) || null,
        status: accountStatus || "pending_verification",
        notes: text(body, "notes", 2000) || null,
        created_by: authData.user.id,
      });
      if (error)
        throw new Error(`Unable to create the operator directory record: ${error.message}`);
    } else if (role === "OPERATIONS") {
      const { error } = await adminClient.from("operations_members").insert({
        profile_id: userId,
        full_name: fullName,
        email,
        mobile: mobile || null,
        department: text(body, "department", 160) || "Operations",
        designation: text(body, "designation", 160) || "Operations Team",
        status: accountStatus || "active",
        notes: text(body, "notes", 2000) || null,
        created_by: authData.user.id,
      });
      if (error)
        throw new Error(`Unable to create the Operations directory record: ${error.message}`);
    } else {
      const callerClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      });
      const { error } = await callerClient.rpc("insert_sales_member", {
        p_profile_id: userId,
        p_full_name: fullName,
        p_email: email,
        p_mobile: mobile || null,
        p_department: text(body, "department", 160) || null,
        p_notes: text(body, "notes", 2000) || null,
        p_identity_doc_path: null,
        p_identity_doc_name: null,
        p_created_by: authData.user.id,
      });
      if (error) throw new Error(`Unable to create the Sales directory record: ${error.message}`);
    }
  } catch (error) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(userId);
    if (rollbackError) {
      throw new Error(
        `${error instanceof Error ? error.message : "Account setup failed."} The login could not be rolled back; user id ${userId}. Disable it in Supabase Auth before retrying. Rollback error: ${rollbackError.message}`,
      );
    }
    throw error;
  }

  return { user_id: userId, email };
}

export const invokeManagedAccountFunction = createServerFn({ method: "POST" })
  .validator((data: ManagedAccountRequest) => data)
  .handler(runManagedAccountFunction);
