import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { brand } from "@/content/site";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase embeds the recovery token in the URL hash and fires PASSWORD_RECOVERY
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
    } catch {
      setError("This recovery link is invalid or expired. Request a new link and try again.");
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
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-md items-center justify-center px-5 py-12">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-panel w-full border border-champagne/20 bg-[oklch(0.1_0.008_275/0.85)] p-8 text-center backdrop-blur-md md:p-10"
            >
              <span className="whisper text-champagne">Password Updated</span>
              <h1 className="mt-6 font-serif text-4xl font-light text-ivory">Access restored.</h1>
              <p className="mt-4 font-serif text-lg italic text-ivory/60">
                Your password has been updated. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={() => void navigate({ to: "/login" })}
                className="mt-8 inline-flex items-center gap-4 whisper text-champagne transition-colors hover:text-ivory"
              >
                <span>SIGN IN</span>
                <span className="block h-px w-10 bg-gold/50" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="auth-panel w-full border border-ivory/10 bg-[oklch(0.1_0.008_275/0.85)] p-8 backdrop-blur-md md:p-10"
            >
              <span className="whisper text-champagne">New Password</span>
              <h1 className="mt-4 font-serif text-4xl font-light text-ivory">Set new password.</h1>

              {!ready && (
                <p className="mt-3 font-serif text-sm italic text-ivory/40">
                  Waiting for recovery session… If this persists,{" "}
                  <Link to="/forgot-password" className="text-champagne">
                    request a new link.
                  </Link>
                </p>
              )}

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
                  <span className="whisper block text-ivory/45">New password</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-light"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-out group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Confirm new password</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="field-light"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-out group-focus-within:scale-x-100" />
                </label>

                <button
                  type="submit"
                  disabled={pending || !ready}
                  className="group mt-2 inline-flex w-full items-center justify-between border border-champagne/40 px-5 py-4 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10 disabled:opacity-50"
                >
                  <span>{pending ? "Updating…" : "UPDATE PASSWORD"}</span>
                  <span className="relative block h-px w-10 overflow-hidden bg-gold/50">
                    <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-500 group-hover:scale-x-100" />
                  </span>
                </button>
              </form>

              <div className="mt-8 border-t border-ivory/10 pt-6">
                <Link to="/login" className="whisper text-ivory/40 transition-colors hover:text-champagne">
                  ← Back to sign in
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
