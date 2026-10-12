import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Plane,
  Menu,
  ChevronDown,
  ChevronsLeft,
  Plus,
  Search,
  Bell,
  CalendarClock,
  ArrowUpRight,
  Sun,
  Moon,
} from "lucide-react";
import { Toaster } from "sonner";
import { CrmProvider, useCrm } from "./store";
import { navigation, pageTitle } from "./config";
import { RecordForm, formNames, type FormRequest, type FormKind } from "./forms";
import { Button, Modal, Badge } from "./ui";
import { LeadDetail } from "./profile";
import { audit } from "./repository";
import "./crm.css";
const UI = createContext<{ form: (request: FormRequest) => void; lead: (id: string) => void }>({
  form: () => {},
  lead: () => {},
});
export const useCrmUI = () => useContext(UI);
export function CrmLayout() {
  return (
    <CrmProvider>
      <Workspace />
    </CrmProvider>
  );
}
function Workspace() {
  const { data, loading, error, retry, mutate } = useCrm();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const page = pathname.split("/")[2] ?? "dashboard";
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [closed, setClosed] = useState<string[]>([]),
    [quick, setQuick] = useState(false),
    [notifications, setNotifications] = useState(false),
    [profile, setProfile] = useState(false),
    [search, setSearch] = useState(""),
    [request, setRequest] = useState<FormRequest | null>(null),
    [leadId, setLeadId] = useState("");
  const goForm = (kind: FormKind) => {
    setQuick(false);
    setRequest({ kind });
  };
  return (
    <UI.Provider value={{ form: setRequest, lead: setLeadId }}>
      <div
        className={`crm ${data.settings.theme === "dark" ? "crm-dark" : ""} ${collapsed ? "crm-collapsed" : ""}`}
      >
        {mobile && (
          <button
            className="crm-scrim"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={`crm-sidebar ${mobile ? "is-open" : ""}`}>
          <Link to="/crm/dashboard" className="crm-brand">
            <span className="crm-brand-icon">
              <Plane size={24} />
            </span>
            <span>
              <strong>
                VIMAN<span className="crm-brand-crm">CRM</span>
              </strong>
              <small>RELATIONSHIPS. ELEVATED.</small>
            </span>
          </Link>
          <div className="crm-workspace-label">
            <span className="crm-avatar">V</span>
            <span>
              {data.settings.workspace}
              <small>Local demonstration</small>
            </span>
            <ChevronDown size={15} />
          </div>
          <nav aria-label="CRM navigation">
            {navigation.map((group) => (
              <div className="crm-nav-group" key={group.name}>
                <button
                  className="crm-group-label"
                  onClick={() =>
                    setClosed((c) =>
                      c.includes(group.name)
                        ? c.filter((n) => n !== group.name)
                        : [...c, group.name],
                    )
                  }
                  aria-expanded={!closed.includes(group.name)}
                >
                  <span>{group.name}</span>
                  <ChevronDown size={12} />
                </button>
                {!closed.includes(group.name) &&
                  group.items.map(([key, title, Icon]) => (
                    <Link
                      key={key}
                      to={`/crm/${key}`}
                      title={title}
                      className={`crm-nav-link ${page === key ? "active" : ""}`}
                      onClick={() => setMobile(false)}
                    >
                      <Icon size={17} />
                      <span>{title}</span>
                      {key === "leads" && (
                        <small>{data.leads.filter((l) => l.status !== "Archived").length}</small>
                      )}
                    </Link>
                  ))}
              </div>
            ))}
          </nav>
          <div className="crm-sidebar-bottom">
            <span className="crm-demo-dot" />
            <span>Demo workspace · v1.0</span>
            <Button aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}>
              <ChevronsLeft size={16} />
            </Button>
          </div>
        </aside>
        <div className="crm-main">
          <header className="crm-topbar">
            <Button
              className="crm-mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={19} />
            </Button>
            <div className="crm-breadcrumb">
              Workspace <span>/</span>
              <strong>{pageTitle(page)}</strong>
            </div>
            <div className="crm-global-search">
              <Search size={16} />
              <input
                aria-label="Global search"
                placeholder="Search leads, customers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <div className="crm-search-results">
                  {data.leads
                    .filter((l) =>
                      `${l.name} ${l.email} ${l.mobile}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setLeadId(l.id);
                          setSearch("");
                        }}
                      >
                        {l.name}
                        <small>
                          {l.service} · {l.email}
                        </small>
                      </button>
                    ))}
                  {data.customers
                    .filter(
                      (c) =>
                        `${c.name} ${c.email} ${c.mobile}`
                          .toLowerCase()
                          .includes(search.toLowerCase()) &&
                        !data.leads.some((l) => l.customerId === c.id),
                    )
                    .slice(0, 5)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setRequest({ kind: "customers", id: c.id });
                          setSearch("");
                        }}
                      >
                        {c.name}
                        <small>Customer · {c.company}</small>
                      </button>
                    ))}
                  {!data.customers.some((c) =>
                    `${c.name} ${c.email} ${c.mobile}`.toLowerCase().includes(search.toLowerCase()),
                  ) &&
                    !data.leads.some((l) =>
                      `${l.name} ${l.email} ${l.mobile}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    ) && <p>No matching contacts.</p>}
                </div>
              )}
            </div>
            <div className="crm-popover-wrap">
              <Button className="primary" onClick={() => setQuick(!quick)}>
                <Plus size={16} />
                <span>Quick add</span>
                <ChevronDown size={13} />
              </Button>
              {quick && (
                <div className="crm-popover">
                  {(
                    [
                      "leads",
                      "opportunities",
                      "customers",
                      "tasks",
                      "followups",
                      "campaigns",
                      "quotations",
                    ] as const
                  ).map((kind) => (
                    <button key={kind} onClick={() => goForm(kind)}>
                      Create {formNames[kind]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/crm/tasks" title="Tasks due" className="crm-icon-link">
              <CalendarClock size={19} />
              <sup>
                {data.tasks.filter((t) => t.status !== "Completed" && t.due < "2026-10-13").length}
              </sup>
            </Link>
            <Button aria-label="Notifications" onClick={() => setNotifications(true)}>
              <Bell size={19} />
              {data.settings.notifications && data.notifications.some((n) => !n.read) && (
                <i className="crm-notification-dot" />
              )}
            </Button>
            <Button
              aria-label="Toggle theme"
              onClick={() =>
                void mutate((d) => {
                  d.settings.theme = d.settings.theme === "dark" ? "light" : "dark";
                }, "")
              }
            >
              {data.settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <button
              className="crm-avatar"
              aria-label="Profile menu"
              onClick={() => setProfile(true)}
            >
              VK
            </button>
          </header>
          <div className="crm-demo-banner">
            <span className="crm-demo-dot" />
            UI preview · Sample data as of 12 Oct 2026 · Changes saved in this browser
            <span>No live integrations</span>
          </div>
          <main className="crm-content">
            {loading ? (
              <div className="crm-loading" role="status">
                Loading your CRM workspace…
              </div>
            ) : error ? (
              <div role="alert" className="crm-error">
                <h2>Unable to load local workspace</h2>
                <p>{error}</p>
                <Button onClick={retry}>Retry</Button>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
          <footer className="crm-footer">
            VIMAN CRM <span>Your next relationship starts here.</span>
          </footer>
        </div>
        {request && (
          <RecordForm
            key={`${request.kind}-${request.id ?? "new"}-${request.leadId ?? ""}`}
            request={request}
            onClose={() => setRequest(null)}
          />
        )}{" "}
        {leadId && <LeadDetail id={leadId} onClose={() => setLeadId("")} />}
        {notifications && (
          <Modal title="Notifications" onClose={() => setNotifications(false)}>
            <Button
              onClick={() =>
                void mutate((d) => {
                  d.notifications.forEach((n) => (n.read = true));
                }, "Notifications marked read")
              }
            >
              Mark all read
            </Button>
            {data.notifications.map((n) => (
              <button
                className="crm-notification"
                key={n.id}
                onClick={() => {
                  setNotifications(false);
                  setLeadId(n.leadId);
                  void mutate((d) => {
                    d.notifications.find((x) => x.id === n.id)!.read = true;
                  }, "");
                }}
              >
                {n.text}
                <Badge>{n.read ? "Read" : "Unread"}</Badge>
              </button>
            ))}
          </Modal>
        )}
        {profile && (
          <Modal title="Workspace profile" onClose={() => setProfile(false)}>
            <p>
              You are exploring the browser-local Viman CRM workspace. Existing account roles remain
              unchanged.
            </p>
            <Link to="/sales/dashboard" className="crm-btn">
              Sales dashboard <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/dashboard" className="crm-btn">
              Admin dashboard <ArrowUpRight size={15} />
            </Link>
            <Link to="/crm/settings" onClick={() => setProfile(false)} className="crm-btn">
              CRM preferences
            </Link>
          </Modal>
        )}
        <Toaster richColors position="bottom-right" />
      </div>
    </UI.Provider>
  );
}
