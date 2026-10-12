import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    // 1. Authenticate caller
    const callerToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!callerToken)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(callerToken);
    if (!caller)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    // 2. Verify caller is ADMIN
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles").select("role").eq("id", caller.id).single();
    if (callerProfile?.role !== "ADMIN")
      return new Response(JSON.stringify({ error: "Forbidden: ADMIN role required" }), { status: 403, headers: corsHeaders });

    // 3. Parse and validate payload
    const body = await req.json() as {
      email: string; password: string; full_name: string;
      mobile?: string; department?: string; designation?: string;
      status?: string; notes?: string;
    };
    body.email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (typeof body.password !== "string") body.password = "";
    const { email, password, full_name } = body;

    if (!email || !password || !full_name)
      return new Response(JSON.stringify({ error: "email, password and full_name are required" }), { status: 400, headers: corsHeaders });
    if (password.length < 8)
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), { status: 400, headers: corsHeaders });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return new Response(JSON.stringify({ error: "Invalid email address" }), { status: 400, headers: corsHeaders });

    if (body.status && !["active", "inactive", "suspended"].includes(body.status))
      return new Response(JSON.stringify({ error: "Invalid account status" }), { status: 400, headers: corsHeaders });

    // 4. Check for duplicate email
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("profiles").select("id").eq("email", email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing)
      return new Response(JSON.stringify({ error: "An account with this email already exists. If an earlier attempt failed, ask an administrator to review the existing Auth user before retrying." }), { status: 409, headers: corsHeaders });

    // 5. Create auth user (service-role only — never from browser)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, mobile: body.mobile ?? "" },
    });
    if (createError)
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });

    const userId = newUser.user!.id;

    // 6. Promote profile to OPERATIONS
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "OPERATIONS", full_name, mobile: body.mobile ?? null, updated_at: new Date().toISOString() })
      .eq("id", userId).select("id").single();
    if (profileError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) return new Response(JSON.stringify({ error: "Account setup failed and cleanup failed. Ask an administrator to review Auth user " + userId + " before retrying." }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Profile update failed: " + profileError.message }), { status: 500, headers: corsHeaders });
    }

    // 7. Insert operations_members record
    const { error: memberError } = await supabaseAdmin.from("operations_members").insert({
      profile_id: userId, full_name, email,
      mobile: body.mobile ?? null,
      department: body.department ?? null,
      designation: body.designation ?? null,
      status: body.status ?? "active",
      notes: body.notes ?? null,
      created_by: caller.id,
    });
    if (memberError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) return new Response(JSON.stringify({ error: "Account setup failed and cleanup failed. Ask an administrator to review Auth user " + userId + " before retrying." }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Member record insert failed: " + memberError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ user_id: userId, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
