import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function PortalShell({
  children,
  title,
  nav,
  onLogout,
  headerAction,
}: {
  children: ReactNode;
  title: string;
  nav: readonly { label: string; to: string }[];
  onLogout?: () => void;
  headerAction?: ReactNode;
}) {
  const { profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-obsidian p-5 text-ivory sm:p-8">
      <div className="mx-auto flex max-w-7xl gap-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:flex lg:flex-col" style={{ minHeight: "100vh" }}>
          <div className="sticky top-0 flex flex-col h-screen py-8 overflow-y-auto">
            <Link to="/" className="font-serif text-2xl tracking-[0.2em] text-ivory">
              HJ
            </Link>
            <p className="mt-1 whisper text-champagne">{profile?.role ?? "PORTAL"}</p>
            <p className="mt-1 text-xs text-ivory/40">{profile?.full_name}</p>

            <nav className="mt-8 flex-1 space-y-0.5">
              {nav.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`block border px-3 py-2 text-xs transition-colors ${
                      active
                        ? "border-champagne/30 bg-champagne/10 text-champagne"
                        : "border-transparent text-ivory/55 hover:border-white/10 hover:text-ivory"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="mt-6 whisper text-ivory/40 transition-colors hover:text-champagne text-left"
              >
                Logout →
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
            <div>
              <p className="whisper text-champagne">Private portal</p>
              <h1 className="mt-2 font-serif text-5xl font-light">{title}</h1>
              <p className="mt-2 text-sm text-ivory/50">{profile?.email}</p>
            </div>
            {headerAction}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
