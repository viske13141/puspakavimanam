import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  LogOut,
  Menu,
  Plane,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { navigation, operatorNavigation, operatorPages, pages } from "./config";
import { useOperations, WorkspaceProvider, type Mode } from "./store";
import { Badge, Button, Empty, useWorkspaceUI, WorkspaceUIProvider } from "./ui";
import { DEMO_DATE, kinds } from "./model";
import "./workspace.css";
export function AviationLayout({ mode }: { mode: Mode }) {
  return (
    <WorkspaceProvider mode={mode}>
      <WorkspaceUIProvider>
        <Layout />
      </WorkspaceUIProvider>
    </WorkspaceProvider>
  );
}
function Layout() {
  const {
    state: { data },
    mode,
    company,
    setCompany,
    companies,
  } = useOperations();
  const { profile, logout } = useAuth();
  const { inspect } = useWorkspaceUI();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState<string[]>([]);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(
        new Date(),
      ),
    );
  }, []);
  const nav = mode === "operator" ? operatorNavigation : navigation;
  const page = (mode === "operator" ? operatorPages : pages).find((p) =>
    pathname.endsWith("/" + p.key),
  );
  const companyName = data.operators.find((o) => o.id === company)?.name ?? "Viman";
  const unread = data.notifications.filter((n) => n.status === "Unread").length;
  const results = search.trim()
    ? kinds
        .flatMap((kind) =>
          data[kind]
            .filter((r) =>
              `${r.name} ${r.id} ${Object.values(r.fields).join(" ")}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .slice(0, 5)
            .map((row) => ({ kind, row })),
        )
        .slice(0, 30)
    : [];
  async function signOut() {
    try {
      await logout();
      await navigate({ to: "/login" });
    } catch {
      toast.error("Unable to sign out. Please retry.");
    }
  }
  function sidebar(compact: boolean) {
    let n = 0;
    return (
      <>
        <Link to={`/${mode}/dashboard`} className="av-brand" onClick={() => setMobile(false)}>
          <span className="av-brand-mark">
            <Plane size={23} />
          </span>
          {!compact && (
            <span>
              VIMAN<small>{mode === "operator" ? "OPERATOR PORTAL" : "OPERATIONS CONTROL"}</small>
            </span>
          )}
        </Link>
        {mode === "operator" && !compact && (
          <div className="av-company">
            <span>{companyName.slice(0, 2).toUpperCase()}</span>
            <div>
              {companyName}
              <small>Fictional company context</small>
            </div>
          </div>
        )}
        <nav aria-label={`${mode} navigation`} className="av-nav">
          {nav.map((group) => (
            <div key={group.group} className="av-nav-group">
              <button
                className="av-group-title"
                title={group.group}
                aria-expanded={!closed.includes(group.group)}
                onClick={() =>
                  setClosed((old) =>
                    old.includes(group.group)
                      ? old.filter((g) => g !== group.group)
                      : [...old, group.group],
                  )
                }
              >
                {compact ? "···" : group.group}
                {!compact && <ChevronDown size={12} />}
              </button>
              {!closed.includes(group.group) &&
                group.items.map(([key, title, Icon]) => {
                  n++;
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <Link
                          className={`av-nav-link ${pathname === `/${mode}/${key}` ? "active" : ""}`}
                          to={String(`/${mode}/${key}`)}
                          aria-label={title}
                          aria-current={pathname === `/${mode}/${key}` ? "page" : undefined}
                          onClick={() => setMobile(false)}
                        >
                          <Icon size={17} />
                          {!compact && (
                            <>
                              <span>{title}</span>
                              <small>
                                {String(
                                  (mode === "operator" ? operatorPages : pages).findIndex(
                                    (p) => p.key === key,
                                  ) + 1,
                                ).padStart(2, "0")}
                              </small>
                            </>
                          )}
                        </Link>
                      </TooltipTrigger>
                      {compact && <TooltipContent side="right">{title}</TooltipContent>}
                    </Tooltip>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="av-sidebar-footer">
          {!compact && (
            <>
              <span className="av-online" /> Demo workspace <small>Local session only</small>
            </>
          )}
          <button aria-label="Logout" title="Logout" onClick={() => void signOut()}>
            <LogOut size={16} />
          </button>
        </div>
      </>
    );
  }
  return (
    <TooltipProvider>
      <div className={`aviation av-shell ${collapsed ? "av-collapsed" : ""}`}>
        <aside className="av-sidebar">
          {sidebar(collapsed)}
          <button
            className="av-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        </aside>
        <Sheet open={mobile} onOpenChange={setMobile}>
          <SheetContent side="left" className="aviation av-mobile-sidebar">
            <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
            <SheetDescription className="sr-only">All {mode} pages</SheetDescription>
            {sidebar(false)}
          </SheetContent>
        </Sheet>
        <div className="av-main">
          <header className="av-header">
            <button
              className="av-mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <div className="av-breadcrumb">
              <Link to={`/${mode}/dashboard`}>
                {mode === "operator" ? companyName : "Control Center"}
              </Link>
              <ChevronRight size={12} />
              <span>{page?.title}</span>
            </div>
            <div className="av-header-actions">
              <span className="av-date">{today}</span>
              <button
                aria-label="Search workspace"
                className="av-header-search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={17} />
                <span>Search workspace</span>
                <kbd>⌕</kbd>
              </button>
              <Link
                to={`/${mode}/notifications`}
                className="av-notification"
                aria-label={`${unread} unread notifications`}
              >
                <Bell size={18} />
                {unread > 0 && <span>{unread}</span>}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="av-avatar" aria-label="Profile menu">
                  {(profile?.full_name ?? "Mira Shah")
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => void navigate({ to: `/${mode}/profile` })}>
                    <UserRound /> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="av-demo-bar">
            <span>
              <span className="av-online" /> DEMO DATA
            </span>
            <p>Fictional records · simulated actions · resets on refresh</p>
            <span className="av-demo-date">Scenario date: {DEMO_DATE} · IST</span>
          </div>
          {mode === "operator" && import.meta.env.DEV && (
            <label className="av-dev-company">
              Mock testing control — company isolation
              <select
                aria-label="Mock company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <main
            id="workspace-content"
            className="av-content"
            key={mode === "operator" ? company : mode}
          >
            <Outlet />
          </main>
          <footer className="av-footer">
            <span>VIMAN / {mode.toUpperCase()} WORKSPACE</span>
            <span>
              <ShieldCheck size={13} /> UI preview · no live operational connection
            </span>
          </footer>
        </div>
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="aviation av-modal">
            <DialogTitle>Search {mode} workspace</DialogTitle>
            <DialogDescription>
              {mode === "operator"
                ? `Only ${companyName} demo records are searched.`
                : "Search fictional flights, bookings, people and documents."}
            </DialogDescription>
            <label className="av-search">
              <Search size={16} />
              <input
                autoFocus
                aria-label="Global search"
                placeholder="Flight, PNR, aircraft, passenger…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="av-search-results">
              {results.length ? (
                results.map(({ kind, row }) => (
                  <button
                    key={`${kind}-${row.id}`}
                    onClick={() => {
                      setSearchOpen(false);
                      inspect(kind, row.id);
                    }}
                  >
                    <span>
                      <strong>{row.name}</strong>
                      <small>
                        {kind} · {row.id}
                      </small>
                    </span>
                    <Badge>{row.status}</Badge>
                  </button>
                ))
              ) : (
                <Empty
                  title={search ? "No matching records" : "Find your next action"}
                  detail="Search by flight reference, name, booking or document."
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Toaster theme="dark" richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
