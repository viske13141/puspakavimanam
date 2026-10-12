import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply(401, { error: "Unauthorized" });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401, { error: "Unauthorized" });
    const { data: caller, error: callerError } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (callerError || caller.role !== "ADMIN") return reply(403, { error: "ADMIN role required" });
    const { kind, id } = await req.json();
    if (!["operations", "operator"].includes(kind) || typeof id !== "string") return reply(400, { error: "Invalid account" });
    const table = kind === "operations" ? "operations_members" : "operators";
    const role = kind === "operations" ? "OPERATIONS" : "OPERATOR";
    const { data: record, error } = await admin.from(table).select("profile_id").eq("id", id).single();
    if (error || !record) return reply(404, { error: "Account not found. Refresh the list." });
    const { data: target, error: targetError } = await admin.from("profiles").select("role").eq("id", record.profile_id).single();
    if (targetError || target.role !== role || record.profile_id === user.id) return reply(409, { error: "Account role changed; deletion refused." });
    // Auth deletion and cascading profile/member removal happen in one DB transaction.
    // A foreign-key restriction preserves all records and returns an error.
    const { error: deleteError } = await admin.auth.admin.deleteUser(record.profile_id);
    if (deleteError) return reply(409, { error: "Unable to delete account: " + deleteError.message });
    return reply(200, { user_id: record.profile_id });
  } catch {
    return reply(500, { error: "Unable to delete account. Please retry." });
  }
});
