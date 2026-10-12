import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { dashboardForRole, useAuth } from "@/lib/auth";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/aviation#helicopters", label: "Helicopters" },
  { to: "/aviation/private-jets", label: "Private Jets" },
  { to: "/yachts", label: "Yachts" },
  { to: "/aviation#fleet", label: "Fleet" },
  { to: "/experiences", label: "Experiences" },
  { to: "/destinations", label: "Destinations" },
  { to: "/about", label: "About" },
  { to: "/concierge", label: "Contact" },
] as const;

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, isLoading } = useAuth();
  const reduceMotion = useReducedMotion();

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const dashboardTo = role ? dashboardForRole(role) : "/login";
  const dashboardLabel = role
    ? role === "ADMIN"
      ? "Admin"
      : role === "SALES"
        ? "Sales"
        : "Dashboard"
    : "Login";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5E9EF] bg-white/95 shadow-[0_2px_16px_-12px_rgba(20,38,61,0.25)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:h-20 md:px-10">
        <Link
          to="/"
          aria-label="HELITEJET home"
          className="shrink-0 font-serif text-lg font-medium tracking-[0.18em] text-[#14263D] md:text-xl"
        >
          HELITEJET
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 xl:flex">
          {navLinks.map(({ to, label }) => {
            const isHome = to === "/";
            const active = isHome && pathname === "/";
            const hrefPath = to.split("#")[0];
            return (
              <a
                key={to}
                href={to}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap py-2 font-sans text-[0.72rem] font-medium tracking-[0.035em] transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[#B79A65] after:transition-all after:duration-300 hover:text-[#14263D] hover:after:w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B79A65] ${
                  active
                    ? "text-[#14263D] after:!w-full"
                    : pathname === hrefPath && !isHome
                      ? "text-[#596579]"
                      : "text-[#596579]"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-5 xl:flex">
          {!isLoading && (
            <Link
              to={dashboardTo}
              className="font-sans text-xs font-medium tracking-[0.04em] text-[#596579] transition-colors hover:text-[#14263D]"
            >
              {dashboardLabel}
            </Link>
          )}
          <Link
            to="/request-access"
            className="inline-flex min-h-11 items-center bg-[#14263D] px-5 font-sans text-[0.68rem] font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B79A65]"
          >
            BOOK NOW
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-public-navigation"
          className="flex h-11 w-11 items-center justify-center text-[#14263D] transition-colors hover:text-[#B79A65] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B79A65] xl:hidden"
        >
          {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-public-navigation"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-white xl:hidden"
          >
            <nav aria-label="Mobile navigation" className="flex flex-1 flex-col px-6 pt-4">
              {navLinks.map(({ to, label }) => {
                const active = to === "/" && pathname === "/";
                return (
                  <a
                    key={to}
                    href={to}
                    aria-current={active ? "page" : undefined}
                    className={`border-b border-[#E5E9EF] py-3.5 font-serif text-xl font-light transition-colors hover:text-[#B79A65] focus-visible:outline-2 focus-visible:outline-[#B79A65] ${
                      active ? "text-[#B79A65]" : "text-[#14263D]"
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>
            <div className="flex flex-col gap-3 px-6 pb-8 pt-5">
              {!isLoading && (
                <Link
                  to={dashboardTo}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center border border-[#E5E9EF] text-center font-sans text-sm font-medium text-[#14263D]"
                >
                  {dashboardLabel}
                </Link>
              )}
              <Link
                to="/request-access"
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-12 items-center justify-center bg-[#14263D] text-center font-sans text-sm font-semibold tracking-[0.12em] text-white"
              >
                BOOK NOW
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
