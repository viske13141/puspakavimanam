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
      email: string; password: string;
      company_name: string; contact_person: string;
      mobile?: string; licence_number?: string; aoc_number?: string;
      service_type?: string; company_address?: string;
      status?: string; notes?: string;
    };
    body.email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (typeof body.password !== "string") body.password = "";
    const { email, password, company_name, contact_person } = body;

    if (!email || !password || !company_name || !contact_person)
      return new Response(JSON.stringify({ error: "email, password, company_name and contact_person are required" }), { status: 400, headers: corsHeaders });
    if (password.length < 8)
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), { status: 400, headers: corsHeaders });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return new Response(JSON.stringify({ error: "Invalid email address" }), { status: 400, headers: corsHeaders });

    const validServiceTypes = ["helicopter", "private_jet", "both"];
    const serviceType = body.service_type ?? "both";
    if (!validServiceTypes.includes(serviceType))
      return new Response(JSON.stringify({ error: "service_type must be helicopter, private_jet, or both" }), { status: 400, headers: corsHeaders });

    if (body.status && !["pending_verification", "active", "inactive", "suspended", "rejected"].includes(body.status))
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
      user_metadata: { full_name: contact_person, company_name, mobile: body.mobile ?? "" },
    });
    if (createError)
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });

    const userId = newUser.user!.id;

    // 6. Promote profile to OPERATOR
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "OPERATOR",
        full_name: contact_person,
        company: company_name,
        mobile: body.mobile ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId).select("id").single();
    if (profileError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) return new Response(JSON.stringify({ error: "Account setup failed and cleanup failed. Ask an administrator to review Auth user " + userId + " before retrying." }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Profile update failed: " + profileError.message }), { status: 500, headers: corsHeaders });
    }

    // 7. Insert operators record (status defaults to pending_verification)
    const { error: operatorError } = await supabaseAdmin.from("operators").insert({
      profile_id: userId,
      company_name,
      contact_person,
      email,
      mobile: body.mobile ?? null,
      licence_number: body.licence_number ?? null,
      aoc_number: body.aoc_number ?? null,
      service_type: serviceType,
      company_address: body.company_address ?? null,
      status: body.status ?? "pending_verification",
      notes: body.notes ?? null,
      created_by: caller.id,
    });
    if (operatorError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) return new Response(JSON.stringify({ error: "Account setup failed and cleanup failed. Ask an administrator to review Auth user " + userId + " before retrying." }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Operator record insert failed: " + operatorError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ user_id: userId, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
