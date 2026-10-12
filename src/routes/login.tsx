import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import {
  dashboardForRole,
  useAuth,
  requireGuestAccess,
  validateStaffMembership,
  StaffAccessError,
  type UserRole,
} from "@/lib/auth";
import { brand } from "@/content/site";

export const Route = createFileRoute("/login")({
  beforeLoad: () => requireGuestAccess(),
  component: LoginPage,
});

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid email") || m.includes("invalid password"))
    return "Invalid email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Please check your connection.";
  if (m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  return msg || "Something went wrong. Please try again.";
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [navigating, setNavigating] = useState(false);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await login(email, password);
      // Use security-definer RPC to avoid RLS recursion
      const { data, error: profileError } = await supabase.rpc("get_my_profile");
      if (profileError || !data) throw new Error("Unable to load your profile.");
      const profile = Array.isArray(data) ? data[0] : data;
      if (!profile) throw new Error("Unable to load your profile.");
      await validateStaffMembership(profile);
      setNavigating(true);
      // Replace current history entry so back-button won't return to login
      await navigate({ to: dashboardForRole(profile.role as UserRole), replace: true });
    } catch (err) {
      if (err instanceof StaffAccessError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          setError(friendlyError(signOutError.message));
          setPending(false);
          return;
        }
      }
      setNavigating(false);
      setError(friendlyError(err instanceof Error ? err.message : ""));
      setPending(false);
    }
  }

  // Blank screen while redirecting — prevents login page flashing back
  if (navigating) return <div className="auth-light min-h-screen" />;

  return (
    <div className="auth-light relative min-h-screen bg-obsidian text-ivory">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-7 py-7 md:px-10 md:py-9">
        <Link to="/" className="font-serif text-2xl font-light tracking-[0.18em] text-ivory">
          {brand.name}
        </Link>
        <Link
          to="/register"
          className="whisper text-ivory/60 transition-colors hover:text-champagne"
        >
          Register
        </Link>
      </header>

      {/* Form */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="auth-panel w-full border border-ivory/10 bg-[oklch(0.1_0.008_275/0.85)] p-8 backdrop-blur-md md:p-10"
        >
          <span className="whisper text-champagne">Private Portal</span>
          <h1 className="mt-4 font-serif text-4xl font-light text-ivory">Welcome back.</h1>
          <p className="mt-2 font-serif text-base italic text-ivory/50">
            Sign in to continue with your private travel desk.
          </p>

          {/* Quick portal access buttons */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {([
              { label: "Operations", sub: "Internal team", to: "/operations/dashboard" },
              { label: "Operators", sub: "Fleet partners", to: "/operator/dashboard" },
              { label: "CRM", sub: "Sales team", to: "/sales/dashboard" },
            ] as const).map(({ label, sub, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  sessionStorage.setItem("demo_mode", "1");
                  navigate({ to: to as "/operations/dashboard" | "/operator/dashboard" | "/sales/dashboard" });
                }}
                className="border border-ivory/10 bg-ivory/[0.03] px-3 py-3 text-left transition-colors hover:border-champagne/40 hover:bg-champagne/5"
              >
                <p className="whisper text-champagne text-xs">{label}</p>
                <p className="mt-0.5 font-serif text-xs text-ivory/40">{sub}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 font-serif text-xs italic text-ivory/30">
            Click a portal to access directly, or sign in below.
          </p>

          <form onSubmit={submit} className="mt-10 space-y-6">
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

            <label className="group relative block">
              <span className="whisper block text-ivory/45">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-light"
              />
              <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-out group-focus-within:scale-x-100" />
            </label>

            <label className="group relative block">
              <span className="whisper block text-ivory/45">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-light"
              />
              <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-out group-focus-within:scale-x-100" />
            </label>

            <div className="flex items-center justify-between pt-1">
              <Link
                to="/forgot-password"
                className="whisper text-ivory/40 transition-colors hover:text-champagne"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="group mt-2 inline-flex w-full items-center justify-between border border-champagne/40 px-5 py-4 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10 disabled:opacity-50"
            >
              <span>{pending ? "Signing in…" : "LOGIN"}</span>
              <span className="relative block h-px w-10 overflow-hidden bg-gold/50">
                <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-500 group-hover:scale-x-100" />
              </span>
            </button>
          </form>

          <div className="mt-8 border-t border-ivory/10 pt-6 space-y-3">
            <p className="font-serif text-sm text-ivory/50">
              Don't have an account?{" "}
              <Link to="/register" className="text-champagne transition-colors hover:text-ivory">
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
