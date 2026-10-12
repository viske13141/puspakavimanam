import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, requireGuestAccess } from "@/lib/auth";
import { brand } from "@/content/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  beforeLoad: () => (typeof window === "undefined" ? undefined : requireGuestAccess()),
  component: RegisterPage,
});

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists.";
  if (m.includes("password")) return msg;
  if (m.includes("network") || m.includes("fetch")) return "Network error. Please check your connection.";
  return msg || "Something went wrong. Please try again.";
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((c) => ({ ...c, [key]: e.target.value }));

  async function submit(e: React.FormEvent, asAdmin = false) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const { needsConfirmation } = await register(form);
      if (needsConfirmation) {
        // Email confirmation required — can't promote yet, show message
        setConfirmed(true);
        return;
      }
      if (asAdmin) {
        // Promote by email — works regardless of session timing
        const { error: rpcError } = await supabase.rpc("promote_to_admin_by_email", { user_email: form.email });
        if (rpcError) throw new Error("Admin promotion failed: " + rpcError.message);
        await navigate({ to: "/admin/dashboard" });
        return;
      }
      await navigate({ to: "/customer/dashboard" });
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-light relative min-h-screen bg-obsidian text-ivory">
      <header className="relative z-10 flex items-center justify-between px-7 py-7 md:px-10 md:py-9">
        <Link to="/" className="font-serif text-2xl font-light tracking-[0.18em] text-ivory">
          {brand.name}
        </Link>
        <Link to="/login" className="whisper text-ivory/60 transition-colors hover:text-champagne">
          Sign in
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center justify-center px-5 py-12">
        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-panel w-full border border-champagne/20 bg-[oklch(0.1_0.008_275/0.85)] p-8 text-center backdrop-blur-md md:p-10"
            >
              <span className="whisper text-champagne">Account Created</span>
              <h1 className="mt-6 font-serif text-4xl font-light text-ivory">Check your email.</h1>
              <p className="mt-4 font-serif text-lg italic text-ivory/60">
                We've sent a verification link to <span className="text-ivory">{form.email}</span>.
                Please verify your email to activate your account.
              </p>
              <p className="mt-4 font-serif text-sm text-ivory/40">
                Once verified, return here to sign in.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-4 whisper text-champagne transition-colors hover:text-ivory"
              >
                <span>SIGN IN</span>
                <span className="block h-px w-10 bg-gold/50" />
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="auth-panel w-full border border-ivory/10 bg-[oklch(0.1_0.008_275/0.85)] p-8 backdrop-blur-md md:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="whisper text-champagne">
                  {adminMode ? "Admin Account" : "Customer Account"}
                </span>
                <button
                  type="button"
                  onClick={() => { setAdminMode((v) => !v); setError(""); }}
                  className="whisper text-xs text-ivory/30 transition-colors hover:text-champagne"
                >
                  {adminMode ? "← Back to Customer" : "Register as Admin"}
                </button>
              </div>
              <h1 className="mt-4 font-serif text-4xl font-light text-ivory">Create account.</h1>
              {adminMode && (
                <p className="mt-2 font-serif text-sm italic text-amber-400/70">
                  Dev only — requires <code className="text-amber-300/80">promote_self_to_admin()</code> SQL function.
                </p>
              )}

              <form onSubmit={(e) => submit(e, adminMode)} className="mt-10 space-y-6">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="border border-red-300 bg-red-50 px-4 py-3 font-serif text-sm italic text-red-800"
                  >
                    {error}
                  </motion.p>
                )}

                {(
                  [
                    ["fullName", "Full name", "text", "name"],
                    ["email", "Email", "email", "email"],
                    ["mobile", "Mobile number", "tel", "tel"],
                    ["password", "Password", "password", "new-password"],
                    ["confirmPassword", "Confirm password", "password", "new-password"],
                  ] as const
                ).map(([key, label, type, autoComplete]) => (
                  <label key={key} className="group relative block">
                    <span className="whisper block text-ivory/45">{label}</span>
                    <input
                      type={type}
                      required
                      autoComplete={autoComplete}
                      value={form[key]}
                      onChange={update(key)}
                      className="field-light"
                    />
                    <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-out group-focus-within:scale-x-100" />
                  </label>
                ))}

                <button
                  type="submit"
                  disabled={pending}
                  className="group mt-2 inline-flex w-full items-center justify-between border border-champagne/40 px-5 py-4 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10 disabled:opacity-50"
                >
                  <span>{pending ? "Creating account…" : adminMode ? "REGISTER AS ADMIN" : "CREATE ACCOUNT"}</span>
                  <span className="relative block h-px w-10 overflow-hidden bg-gold/50">
                    <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-500 group-hover:scale-x-100" />
                  </span>
                </button>
              </form>

              <div className="mt-8 border-t border-ivory/10 pt-6">
                <p className="font-serif text-sm text-ivory/50">
                  Already have an account?{" "}
                  <Link to="/login" className="text-champagne transition-colors hover:text-ivory">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
