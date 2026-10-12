import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Plane,
  Clock3,
  Radio,
  CircleCheck,
  GitBranch,
  AlertTriangle,
  ShieldCheck,
  Users,
  Plus,
  Building2,
  Files,
  CalendarDays,
  Download,
} from "lucide-react";
import { useOperations } from "./store";
import {
  Button,
  Badge,
  DataTable,
  Empty,
  Filter,
  Notice,
  Panel,
  Tabs,
  Timeline,
  useWorkspaceUI,
  type Column,
} from "./ui";
import { useRecordActions, RecordActions } from "./actions";
import {
  schemas,
  operatorSchemas,
  pages,
  operatorPages,
  flightStatuses,
  type Schema,
} from "./config";
import { DEMO_DATE, DEMO_TIME, displayRow, find, label, type Entry, type Kind } from "./model";
export function usePageQuery() {
  return useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? "" });
}
export function Heading({
  page,
  description,
  children,
}: {
  page: string;
  description?: string;
  children?: ReactNode;
}) {
  const { mode } = useOperations();
  const meta = (mode === "operator" ? operatorPages : pages).find((p) => p.key === page);
  return (
    <div className="av-page-heading">
      <div>
        <div className="av-eyebrow">{meta?.group ?? "Workspace"} / Viman</div>
        <h1>{meta?.title ?? page}</h1>
        <p>
          {description ??
            "Fictional coordination workspace. Every update stays in this demo session."}
        </p>
      </div>
      <div className="av-actions">{children}</div>
    </div>
  );
}
export function Stats({
  items,
}: {
  items: {
    label: string;
    value: number | string;
    icon?: typeof Plane;
    note?: string;
    click?: () => void;
  }[];
}) {
  return (
    <div className="av-stats">
      {items.map((item, i) => {
        const Icon = item.icon ?? Plane;
        const content = (
          <>
            <div className="av-stat-top">
              <span>{item.label}</span>
              <Icon size={16} />
            </div>
            <div className="av-stat-value">
              <strong>{item.value}</strong>
              <small>{item.note ?? "Demo scenario"}</small>
            </div>
            <div className="av-stat-bar">
              <span style={{ width: `${25 + ((i * 9) % 65)}%` }} />
            </div>
          </>
        );
        return item.click ? (
          <button className="av-stat" key={item.label} onClick={item.click}>
            {content}
          </button>
        ) : (
          <div className="av-stat" key={item.label}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
export const flightColumns: Column[] = [
  ["name", "Flight"],
  ["booking", "PNR"],
  ["customer", "Client"],
  ["route", "Route"],
  ["aircraft", "Aircraft"],
  ["operator", "Operator"],
  ["departure", "Departure · IST"],
  ["arrival", "Arrival · IST"],
  ["assignment", "Assignment"],
  ["readiness", "Readiness"],
  ["status", "Flight status"],
].map(([key, title]) => ({ key: key!, title: title! }));
export function FlightActions({ row }: { row: Entry }) {
  const { mode } = useOperations();
  const { inspect } = useWorkspaceUI();
  const { go } = useRecordActions();
  return (
    <>
      <button
        className="av-text-button"
        onClick={() => inspect("bookings", row.fields["booking"]!)}
      >
        Booking
      </button>
      <button
        className="av-text-button"
        onClick={() => go(mode === "operations" ? "assignments" : "preparation", row.id)}
      >
        {mode === "operations" ? "Assign" : "Prepare"}
      </button>
      <button className="av-text-button" onClick={() => go("compliance", row.name)}>
        Compliance
      </button>
    </>
  );
}
export function Overview() {
  const {
    state: { data },
    mode,
  } = useOperations();
  const { inspect } = useWorkspaceUI();
  const { go } = useRecordActions();
  const [date, setDate] = useState(DEMO_DATE);
  const [operator, setOperator] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const flights = data.flights.filter(
    (f) =>
      f.fields["date"] === date &&
      (!operator || f.fields["operator"] === operator) &&
      (!type || displayRow(data, "flights", f).fields["service"] === type) &&
      (!status || f.status === status),
  );
  const count = (statuses: string[]) =>
    data.flights.filter((f) => statuses.includes(f.status)).length;
  const alerts = data.compliance.filter((c) =>
    ["Expired", "Exception Open", "Escalated"].includes(c.status),
  );
  const upcoming = data.flights
    .filter(
      (f) =>
        !["Completed", "Cancelled", "Landed"].includes(f.status) &&
        `${f.fields["date"]} ${f.fields["departure"]}` >= `${DEMO_DATE} ${DEMO_TIME}`,
    )
    .sort((a, b) =>
      `${a.fields["date"]}${a.fields["departure"]}`.localeCompare(
        `${b.fields["date"]}${b.fields["departure"]}`,
      ),
    );
  const stats =
    mode === "operations"
      ? [
          {
            label: "Today's flights",
            value: data.flights.filter((f) => f.fields["date"] === DEMO_DATE).length,
            icon: Plane,
            click: () => go("schedule"),
          },
          {
            label: "Upcoming departures",
            value: upcoming.length,
            icon: Clock3,
            click: () => go("schedule"),
          },
          {
            label: "Flights in progress",
            value: count(["Departed", "Airborne"]),
            icon: Radio,
            click: () => go("monitoring", "Airborne"),
          },
          {
            label: "Completed flights",
            value: count(["Completed"]),
            icon: CircleCheck,
            click: () => go("monitoring", "Completed"),
          },
          {
            label: "Pending assignments",
            value: data.flights.filter((f) => f.fields["assignment"] !== "Accepted").length,
            icon: GitBranch,
            click: () => go("assignments"),
          },
          {
            label: "Delayed flights",
            value: count(["Delayed"]),
            icon: AlertTriangle,
            click: () => go("monitoring", "Delayed"),
          },
          {
            label: "Compliance alerts",
            value: alerts.length,
            icon: ShieldCheck,
            click: () => go("compliance"),
          },
          {
            label: "Pending check-ins",
            value: data.passengers.filter((p) => p.status !== "Cleared").length,
            icon: Users,
            click: () => go("checkin"),
          },
        ]
      : [
          {
            label: "Total aircraft",
            value: data.aircraft.length,
            icon: Plane,
            click: () => go("aircraft"),
          },
          {
            label: "Available aircraft",
            value: data.aircraft.filter((a) => a.status === "Available").length,
            icon: CircleCheck,
            click: () => go("aircraft", "Available"),
          },
          {
            label: "Assigned flights",
            value: data.flights.length,
            icon: GitBranch,
            click: () => go("schedule"),
          },
          {
            label: "Upcoming flights",
            value: upcoming.length,
            icon: Clock3,
            click: () => go("schedule"),
          },
          {
            label: "Flights in progress",
            value: count(["Departed", "Airborne"]),
            icon: Radio,
            click: () => go("flights", "Airborne"),
          },
          {
            label: "Completed flights",
            value: count(["Completed"]),
            icon: CircleCheck,
            click: () => go("flights", "Completed"),
          },
          {
            label: "Pending requests",
            value: data.requests.filter((r) => ["New", "Under Review"].includes(r.status)).length,
            icon: Files,
            click: () => go("requests"),
          },
          {
            label: "Compliance actions",
            value: data.compliance.filter((c) => c.status !== "Verified").length,
            icon: ShieldCheck,
            click: () => go("compliance"),
          },
        ];
  return (
    <>
      <Heading
        page="dashboard"
        description={
          mode === "operations"
            ? "Every flight. Every detail. One coordinated view."
            : `${data.operators[0]?.name ?? "Company"} · Your fleet, journeys and next decisions.`
        }
      >
        <Button onClick={() => go("schedule")}>
          <CalendarDays size={14} /> Flight schedule
        </Button>
        <Button primary onClick={() => go(mode === "operations" ? "bookings" : "requests")}>
          {mode === "operations" ? "Review handovers" : "Review requests"}
          <ArrowUpRight size={14} />
        </Button>
      </Heading>
      <Stats items={stats} />
      <Panel
        title={
          mode === "operations" ? "Today's flight control board" : "Company flight control board"
        }
        caption="An operational snapshot of the fictional scenario. All times IST."
        action={<Badge>Demo scenario</Badge>}
      >
        <div className="av-filter-bar px-5 pt-4">
          <label className="av-filter">
            <span>Flight date</span>
            <input
              type="date"
              aria-label="Flight date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {mode === "operations" && (
            <Filter
              label="Operator"
              value={operator}
              values={data.operators.map((o) => ({ value: o.id, label: o.name }))}
              onChange={setOperator}
            />
          )}
          <Filter
            label="Service"
            value={type}
            values={["Helicopter", "Private Jet"].map((value) => ({ value, label: value }))}
            onChange={setType}
          />
          <Filter
            label="Flight status"
            value={status}
            values={flightStatuses.map((value) => ({ value, label: value }))}
            onChange={setStatus}
          />
          <Button
            onClick={() => {
              setDate(DEMO_DATE);
              setOperator("");
              setType("");
              setStatus("");
            }}
          >
            Reset
          </Button>
        </div>
        <DataTable
          rows={flights}
          kind="flights"
          columns={
            mode === "operator"
              ? flightColumns
                  .filter((c) => !["operator", "customer", "readiness"].includes(c.key))
                  .concat({ key: "crew", title: "Crew" })
              : flightColumns
          }
          actions={(row) => <FlightActions row={row} />}
          pageSize={5}
        />
      </Panel>
      <div className="av-grid-3">
        <Panel title="Upcoming departures" caption="Scheduled moments to keep in view">
          <div className="av-list">
            {upcoming.slice(0, 4).map((f) => (
              <button key={f.id} onClick={() => inspect("flights", f.id)}>
                <span>
                  <strong>
                    {f.fields["departure"]} <span className="av-muted">IST · {f.name}</span>
                  </strong>
                  <small>{displayRow(data, "flights", f).fields["route"]}</small>
                </span>
                <Badge>{f.status}</Badge>
              </button>
            ))}
            {!upcoming.length && <Empty title="No upcoming departures" />}
          </div>
        </Panel>
        <Panel
          title={mode === "operations" ? "Assignment queue" : "Pending charter requests"}
          caption="Keep the next decision moving"
        >
          <div className="av-list">
            {(mode === "operations"
              ? data.flights.filter((f) => f.fields["assignment"] !== "Accepted")
              : data.requests.filter((r) => ["New", "Under Review"].includes(r.status))
            )
              .slice(0, 4)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => go(mode === "operations" ? "assignments" : "requests", r.name)}
                >
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.fields["assignment"] ?? r.status}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </div>
        </Panel>
        <Panel title="Compliance attention" caption="Evidence and open issues">
          <div className="av-list">
            {alerts.slice(0, 4).map((c) => (
              <button key={c.id} onClick={() => inspect("compliance", c.id)}>
                <span>
                  <strong>{c.name}</strong>
                  <small>{label(data, c, "flight")}</small>
                </span>
                <Badge>{c.fields["severity"]}</Badge>
              </button>
            ))}
            {!alerts.length && <Empty title="No flagged exceptions" />}
          </div>
        </Panel>
      </div>
      <div className="av-grid-3">
        <Panel
          title="Aircraft availability"
          caption={`${data.aircraft.length} aircraft in this workspace`}
        >
          <div className="av-list">
            {["Available", "Assigned", "In Flight", "Maintenance", "Unavailable"].map((s) => (
              <button key={s} onClick={() => go("aircraft", s)}>
                <Badge>{s}</Badge>
                <strong>{data.aircraft.filter((a) => a.status === s).length}</strong>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={mode === "operations" ? "Pending operational tasks" : "Crew availability"}>
          <div className="av-list">
            {(mode === "operations"
              ? data.tasks.filter((t) => t.status !== "Completed")
              : data.crew
            )
              .slice(0, 5)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => inspect(mode === "operations" ? "tasks" : "crew", r.id)}
                >
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.fields["due"] ?? r.fields["role"]}</small>
                  </span>
                  <Badge>{r.status}</Badge>
                </button>
              ))}
          </div>
        </Panel>
        <Panel title="Recent flight activity">
          <Timeline
            items={data.flights
              .flatMap((f) => f.history.slice(-1).map((h) => `${f.name} · ${h}`))
              .slice(-5)}
          />
        </Panel>
      </div>
      <Panel
        title={
          mode === "operator" ? "Viman Operations messages" : "Notifications requiring attention"
        }
      >
        <div className="av-list">
          {(mode === "operator"
            ? data.messages
            : data.notifications.filter((n) => n.status === "Unread")
          )
            .slice(0, 3)
            .map((n) => (
              <button
                key={n.id}
                onClick={() => go(mode === "operator" ? "messages" : "notifications", n.name)}
              >
                <span>
                  <strong>{n.name}</strong>
                  <small>{n.fields["timestamp"]}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
        </div>
      </Panel>
    </>
  );
}
export function Directory({ page }: { page: string }) {
  const {
    state: { data },
    dispatch,
    mode,
  } = useOperations();
  const ui = useWorkspaceUI();
  const a = useRecordActions();
  const q = usePageQuery();
  const schema = (mode === "operator" ? operatorSchemas : schemas)[page]!;
  const [status, setStatus] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [view, setView] = useState("Table");
  const [tab, setTab] = useState(page === "incidents" ? "Incidents" : "Compliance Checklist");
  const [cardQuery, setCardQuery] = useState(q);
  let kind = schema.kind;
  let columns = schema.columns;
  let rows = data[kind];
  if (page === "compliance" && mode === "operator" && tab !== "Compliance Checklist") {
    kind = "documents";
    columns = schemas["documents"]!.columns;
    rows = data.documents.filter((d) =>
      tab === "Expiry Alerts"
        ? d.fields["expiry"]! < "2026-11-10"
        : tab === "Aircraft Documents"
          ? d.fields["category"] === "Aircraft Documents"
          : tab === "Crew Documents"
            ? d.fields["category"] === "Crew Documents"
            : !["Crew Documents", "Aircraft Documents"].includes(d.fields["category"]!),
    );
  }
  if (page === "incidents") {
    rows = rows.filter(
      (r) => r.fields["type"] === (tab === "Incidents" ? "Incident" : "Diversion"),
    );
    if (tab === "Diversions")
      columns = [
        ["name", "Diversion"],
        ["flight", "Flight"],
        ["originalDestination", "Original destination"],
        ["revisedDestination", "Revised destination"],
        ["reason", "Reason"],
        ["reported", "Reported"],
        ["pic", "Pilot-in-command"],
        ["atc", "ATC"],
        ["dispatch", "Dispatch"],
        ["permission", "Landing permission"],
        ["status", "Status"],
      ];
  }
  const filtered = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      Object.entries(filters).every(([key, val]) => !val || r.fields[key] === val),
  );
  const filteredCards = filtered.filter((r) =>
    `${r.name} ${r.status} ${Object.values(r.fields)
      .map((v) => find(data, "operators", v)?.name ?? v)
      .join(" ")}`
      .toLowerCase()
      .includes(cardQuery.toLowerCase()),
  );
  function addButton() {
    if (page === "quotes")
      return (
        <Button primary onClick={() => a.quote()}>
          <Plus size={14} /> Create draft
        </Button>
      );
    if (page === "documents" || (page === "compliance" && mode === "operator"))
      return (
        <Button primary onClick={() => a.upload()}>
          <Plus size={14} /> Mock document
        </Button>
      );
    if (page === "notifications")
      return (
        <Button primary onClick={() => dispatch({ type: "read-all" })}>
          Mark all as read
        </Button>
      );
    if (["ground", "ground-handling"].includes(page))
      return (
        <Button
          primary
          onClick={() =>
            a.create(
              "tasks",
              "Create ground task",
              ["name", "flight", "type", "staff", "due", "priority", "status", "notes"],
              schema.statuses,
              { due: `${DEMO_DATE}T12:00` },
            )
          }
        >
          <Plus size={14} /> Create task
        </Button>
      );
    if (page === "incidents")
      return (
        <Button primary onClick={() => a.incident(tab === "Incidents" ? "Incident" : "Diversion")}>
          <Plus size={14} /> Record {tab === "Incidents" ? "incident" : "diversion"}
        </Button>
      );
    if (mode === "operator" && page === "aircraft")
      return (
        <Button
          primary
          onClick={() =>
            a.create(
              "aircraft",
              "Add aircraft · pending Admin approval",
              [
                "name",
                "registration",
                "type",
                "manufacturer",
                "model",
                "capacity",
                "base",
                "notes",
              ],
              ["Pending Approval"],
            )
          }
        >
          <Plus size={14} /> Add aircraft
        </Button>
      );
    if (mode === "operator" && page === "crew")
      return (
        <Button
          primary
          onClick={() =>
            a.create(
              "crew",
              "Add fictional crew",
              [
                "name",
                "role",
                "licence",
                "licenceExpiry",
                "medicalExpiry",
                "qualifications",
                "availability",
                "notes",
              ],
              ["Review Required"],
            )
          }
        >
          <Plus size={14} /> Add crew
        </Button>
      );
    return null;
  }
  return (
    <>
      <Heading page={page} description={schema.description}>
        {addButton()}
      </Heading>
      {page === "crew" && (
        <Notice>
          {
            data.crew.filter(
              (c) =>
                c.fields["licenceExpiry"]! < DEMO_DATE || c.fields["medicalExpiry"]! < DEMO_DATE,
            ).length
          }{" "}
          crew records have expired demo documents. A licence or uploaded file does not establish
          flight-specific eligibility.
        </Notice>
      )}
      {page === "incidents" && (
        <Notice>
          Formal regulatory reporting must follow the operator's approved procedures and applicable
          regulations. These fictional records are not automatically classified as legally
          reportable.
        </Notice>
      )}
      {page === "hems" && (
        <>
          <Notice>
            Coordination only. Patient references are masked; no clinical decision-making or medical
            clearance is provided.
          </Notice>
          <Stats
            items={[
              { label: "Medical transfers", value: data.hems.length },
              {
                label: "Awaiting documents",
                value: data.hems.filter((h) => h.fields["documents"]?.includes("pending")).length,
              },
              {
                label: "Equipment checks",
                value: data.hems.filter((h) => h.fields["equipment"] === "Check Pending").length,
              },
              {
                label: "Ambulance coordination",
                value: data.hems.filter((h) => h.fields["ambulance"] === "Pending").length,
              },
              {
                label: "Completed transfers",
                value: data.hems.filter((h) => h.status === "Completed").length,
              },
            ]}
          />
        </>
      )}
      {page === "compliance" && (
        <Stats
          items={[
            {
              label: "Pending verifications",
              value: data.compliance.filter((c) => c.status === "Pending").length,
            },
            {
              label: "Expired documents",
              value: data.documents.filter((d) => d.fields["expiry"]! < DEMO_DATE).length,
            },
            {
              label: "Weight & balance warnings",
              value: data.compliance.filter(
                (c) => c.fields["category"] === "Weight & Balance" && c.status !== "Verified",
              ).length,
            },
            {
              label: "Landing permission issues",
              value: data.compliance.filter(
                (c) => c.fields["category"] === "Landing Permissions" && c.status !== "Verified",
              ).length,
            },
            {
              label: "Open exceptions",
              value: data.compliance.filter((c) =>
                ["Exception Open", "Escalated"].includes(c.status),
              ).length,
            },
          ]}
        />
      )}
      {page === "incidents" && (
        <Tabs values={["Incidents", "Diversions"]} selected={tab} onChange={setTab} />
      )}
      {page === "compliance" && mode === "operator" && (
        <Tabs
          values={[
            "Aircraft Documents",
            "Crew Documents",
            "Flight Documents",
            "Compliance Checklist",
            "Expiry Alerts",
          ]}
          selected={tab}
          onChange={(v) => {
            setTab(v);
            setStatus("");
            setFilters({});
          }}
        />
      )}
      {page === "aircraft" && (
        <Tabs values={["Table", "Cards"]} selected={view} onChange={setView} />
      )}
      {["ground", "ground-handling"].includes(page) && (
        <Tabs values={["Table", "Kanban"]} selected={view} onChange={setView} />
      )}
      <div className="av-filter-bar">
        <Filter
          label="Status"
          value={status}
          onChange={setStatus}
          values={Array.from(new Set(rows.map((r) => r.status))).map((value) => ({
            value,
            label: value,
          }))}
        />
        {schema.filters.map((key) => (
          <Filter
            key={key}
            label={key.replace(/^./, (c) => c.toUpperCase())}
            value={filters[key] ?? ""}
            onChange={(v) => setFilters({ ...filters, [key]: v })}
            values={Array.from(new Set(rows.map((r) => r.fields[key] ?? "").filter(Boolean))).map(
              (v) => ({
                value: v,
                label: label(
                  data,
                  { id: "", name: "", status: "", history: [], fields: { [key]: v } },
                  key,
                ),
              }),
            )}
          />
        ))}
        <Button
          onClick={() => {
            setStatus("");
            setFilters({});
            setCardQuery("");
          }}
        >
          Clear filters
        </Button>
        {page === "aircraft" && (
          <Button onClick={() => a.go(mode === "operator" ? "availability" : "schedule")}>
            Availability calendar
          </Button>
        )}
      </div>
      {view === "Cards" ? (
        <>
          <label className="av-search mb-4">
            <input
              aria-label="Search aircraft cards"
              value={cardQuery}
              onChange={(e) => setCardQuery(e.target.value)}
              placeholder="Search aircraft…"
            />
          </label>
          <div className="av-grid-3">
            {filteredCards.map((r) => (
              <Panel
                key={r.id}
                title={r.fields["registration"] ?? r.name}
                caption={r.fields["model"] ?? ""}
              >
                <div
                  className="av-aircraft-art"
                  role="img"
                  aria-label={`Illustration of ${r.fields["type"]}`}
                >
                  <Plane />
                </div>
                <div className="p-5">
                  <div className="av-toolbar">
                    <Badge>{r.status}</Badge>
                    <span className="av-muted">{r.fields["capacity"]} seats</span>
                  </div>
                  <p className="av-muted mb-3">{r.fields["base"] ?? label(data, r, "operator")}</p>
                  <div className="av-actions">
                    <Button onClick={() => ui.inspect("aircraft", r.id)}>View aircraft</Button>
                    <RecordActions kind="aircraft" row={r} />
                  </div>
                </div>
              </Panel>
            ))}
          </div>
          {!filteredCards.length && <Empty />}
        </>
      ) : view === "Kanban" ? (
        <div className="av-kanban">
          {schema.statuses.map((s) => (
            <section className="av-kanban-column" key={s}>
              <h3>
                {s}
                <span>{filtered.filter((r) => r.status === s).length}</span>
              </h3>
              {filtered
                .filter((r) => r.status === s)
                .map((r) => (
                  <div className="av-kanban-card" key={r.id}>
                    <button className="av-record-link" onClick={() => ui.inspect(kind, r.id)}>
                      {r.name}
                    </button>
                    <p>
                      {label(data, r, "flight")} · {r.fields["due"]}
                    </p>
                    <Badge>{r.fields["priority"]}</Badge>
                    <RecordActions kind={kind} row={r} />
                  </div>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <Panel
          title={`${page === "incidents" ? tab : (mode === "operator" ? operatorPages : pages).find((p) => p.key === page)?.title} directory`}
          caption={`${filtered.length} fictional records`}
        >
          <DataTable
            key={`${page}-${q}-${tab}`}
            kind={kind}
            rows={filtered}
            initialQuery={q}
            columns={columns.map(([key, title]) => ({ key, title }))}
            actions={(row) => <RecordActions kind={kind} row={row} />}
          />
        </Panel>
      )}
      {page === "landing-sites" && (
        <Notice>
          An available site is not a legally approved landing site. Permissions, security and
          fire-cover evidence require separate review.
        </Notice>
      )}
    </>
  );
}
