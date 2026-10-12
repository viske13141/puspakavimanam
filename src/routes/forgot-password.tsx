import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, requireGuestAccess } from "@/lib/auth";
import { brand } from "@/content/site";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: () => (typeof window === "undefined" ? undefined : requireGuestAccess()),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await resetPassword(email);
    } catch {
      // Intentionally swallow — never reveal if email exists
    } finally {
      setPending(false);
      setSent(true);
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
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-panel w-full border border-champagne/20 bg-[oklch(0.1_0.008_275/0.85)] p-8 text-center backdrop-blur-md md:p-10"
            >
              <span className="whisper text-champagne">Recovery Link Sent</span>
              <h1 className="mt-6 font-serif text-4xl font-light text-ivory">Check your inbox.</h1>
              <p className="mt-4 font-serif text-lg italic text-ivory/60">
                If an account exists for this email, a secure password reset link has been sent.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-4 whisper text-champagne transition-colors hover:text-ivory"
              >
                <span>RETURN TO SIGN IN</span>
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
              <span className="whisper text-champagne">Password Recovery</span>
              <h1 className="mt-4 font-serif text-4xl font-light text-ivory">Reset access.</h1>
              <p className="mt-2 font-serif text-base italic text-ivory/50">
                Enter your email and we'll send a secure recovery link.
              </p>

              <form onSubmit={submit} className="mt-10 space-y-6">
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

                <button
                  type="submit"
                  disabled={pending}
                  className="group mt-2 inline-flex w-full items-center justify-between border border-champagne/40 px-5 py-4 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10 disabled:opacity-50"
                >
                  <span>{pending ? "Sending…" : "SEND RESET LINK"}</span>
                  <span className="relative block h-px w-10 overflow-hidden bg-gold/50">
                    <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-500 group-hover:scale-x-100" />
                  </span>
                </button>
              </form>

              <div className="mt-8 border-t border-ivory/10 pt-6">
                <p className="font-serif text-sm text-ivory/50">
                  Remember your password?{" "}
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
