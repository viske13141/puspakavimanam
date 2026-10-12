import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  ChevronLeft, ChevronRight, Bell, Search, X, LogOut, User,
  Menu as MenuIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { navigation, pages } from "@/features/operations/config";
import { useOperations } from "@/features/operations/store";

function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-[oklch(0.72_0.1_80/0.25)] bg-[oklch(0.55_0.18_55/0.12)] px-4 py-1">
      <span className="whisper text-[0.55rem] tracking-[0.3em] text-[oklch(0.86_0.055_85)]">
        ⚠ DEMO DATA — All records are fictional. No real operational data is displayed.
      </span>
    </div>
  );
}

export function OpsLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useOperations();
  const unread = state.data.notifications.filter((n) => n.status === "Unread").length;
  const currentPage = pages.find((p) => pathname === `/operations/${p.key}`) ?? pages[0]!;

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  const SidebarInner = ({ forMobile = false }: { forMobile?: boolean }) => (
    <div
      className={`flex h-full flex-col border-r border-ivory/10 bg-[oklch(0.10_0.008_275)] transition-all duration-300 ${
        !forMobile && collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Logo row */}
      <div
        className={`flex items-center border-b border-ivory/10 px-3 py-4 ${
          !forMobile && collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {(forMobile || !collapsed) && (
          <Link to="/" className="font-serif text-xl tracking-[0.2em] text-ivory">
            HJ
          </Link>
        )}
        {!forMobile && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded p-1 text-ivory/40 transition-colors hover:text-champagne"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navigation.map((group) => (
          <div key={group.group} className="mb-1">
            {(forMobile || !collapsed) && (
              <p className="whisper px-3 py-1 text-[0.5rem] tracking-[0.35em] text-ivory/25">
                {group.group}
              </p>
            )}
            {group.items.map(([key, title, Icon]) => {
              const to = `/operations/${key}` as const;
              const active = pathname === to;
              return (
                <Link
                  key={key}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  title={!forMobile && collapsed ? title : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    active
                      ? "border-r-2 border-champagne bg-champagne/10 text-champagne"
                      : "text-ivory/50 hover:bg-ivory/[0.04] hover:text-ivory"
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {(forMobile || !collapsed) && <span className="truncate">{title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom profile */}
      <div className={`border-t border-ivory/10 p-3 ${!forMobile && collapsed ? "flex justify-center" : ""}`}>
        {!forMobile && collapsed ? (
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Logout"
            className="text-ivory/30 hover:text-champagne"
          >
            <LogOut size={14} />
          </button>
        ) : (
          <div className="space-y-0.5">
            <p className="whisper text-[0.5rem] text-ivory/25">OPERATIONS</p>
            <p className="truncate text-xs text-ivory/60">{profile?.full_name ?? "Operations"}</p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="whisper text-[0.5rem] text-ivory/30 transition-colors hover:text-champagne"
            >
              Logout →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-obsidian text-ivory">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden h-full shrink-0 lg:flex">
          <SidebarInner />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" />
              <motion.aside
                initial={{ x: -224 }}
                animate={{ x: 0 }}
                exit={{ x: -224 }}
                transition={{ type: "tween", duration: 0.22 }}
                className="absolute left-0 top-0 h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <SidebarInner forMobile />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-ivory/10 bg-[oklch(0.11_0.008_275)] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="text-ivory/50 hover:text-ivory lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon size={16} />
              </button>
              <div>
                <p className="whisper text-[0.5rem] tracking-[0.3em] text-ivory/30">
                  OPERATIONS / {currentPage.group.toUpperCase()}
                </p>
                <h1 className="text-sm font-medium leading-tight text-ivory">
                  {currentPage.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden whisper text-[0.5rem] text-ivory/30 md:block">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>

              {/* Search */}
              {showSearch ? (
                <div className="flex items-center gap-2 border border-ivory/20 bg-obsidian px-2.5 py-1">
                  <Search size={11} className="text-ivory/40" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-36 bg-transparent text-xs text-ivory outline-none placeholder:text-ivory/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearch("");
                    }}
                  >
                    <X size={11} className="text-ivory/40 hover:text-champagne" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="p-1.5 text-ivory/40 transition-colors hover:text-champagne"
                  aria-label="Search"
                >
                  <Search size={14} />
                </button>
              )}

              {/* Notifications */}
              <Link
                to="/operations/notifications"
                className="relative p-1.5 text-ivory/40 transition-colors hover:text-champagne"
                aria-label="Notifications"
              >
                <Bell size={14} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[0.42rem] font-bold text-obsidian">
                    {unread}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link
                to="/operations/profile"
                className="flex items-center gap-1.5 p-1.5 text-ivory/40 transition-colors hover:text-champagne"
                aria-label="My profile"
              >
                <User size={14} />
                <span className="hidden whisper text-[0.5rem] md:block">
                  {profile?.full_name?.split(" ")[0]}
                </span>
              </Link>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
