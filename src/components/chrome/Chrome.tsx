import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useScroll, useSpring } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { brand } from "@/content/site";
import { dashboardForRole, useAuth } from "@/lib/auth";
import { NavigationOverlay } from "./NavigationOverlay";



export function Chrome() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 30 });
  const close = useCallback(() => setOpen(false), []);
  const { role, isLoading } = useAuth();

  useEffect(() => setOpen(false), [pathname]);

  const dashboardTo = role ? dashboardForRole(role) : "/login";
  const dashboardLabel = role === "ADMIN" ? "Admin" : role === "SALES" ? "Sales" : role ? "Dashboard" : null;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-7 py-7 mix-blend-difference md:px-10 md:py-9">
        <Link to="/" aria-label={`${brand.name} home`} className="pointer-events-auto font-serif text-2xl font-light tracking-[0.18em] text-ivory">
          {brand.mark}
        </Link>
        <div className="pointer-events-auto flex items-center gap-5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("helitejet-voice-activate"))}
            aria-label="Open HELITEJET voice concierge"
            className="whisper flex items-center gap-2 text-ivory/80 transition-colors hover:text-champagne"
          >
            <span className="h-2 w-2 rounded-full border border-current" aria-hidden="true" />
            <span>Voice</span>
          </button>

          {!isLoading && (
            dashboardLabel ? (
              <Link
                to={dashboardTo}
                className="whisper flex items-center gap-2 text-ivory/80 transition-colors hover:text-champagne"
              >
                {dashboardLabel}
              </Link>
            ) : (
              <Link
                to="/login"
                className="whisper flex items-center gap-2 text-ivory/80 transition-colors hover:text-champagne"
              >
                Login
              </Link>
            )
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="cinematic-menu"
            aria-haspopup="dialog"
            className="whisper flex items-center gap-4 text-ivory"
          >
            <span>Menu</span>
            <span className="relative block h-3 w-6">
              <span className="absolute left-0 top-0 h-px w-full bg-ivory" />
              <span className="absolute bottom-0 left-0 h-px w-full bg-ivory" />
            </span>
          </button>
        </div>
      </header>

      <motion.div style={{ scaleY: progress, originY: 0 }} className="pointer-events-none fixed left-0 top-0 z-40 h-screen w-px bg-gradient-to-b from-gold via-champagne to-gold" />

      <NavigationOverlay open={open} current={pathname} onClose={close} />
    </>
  );
}
