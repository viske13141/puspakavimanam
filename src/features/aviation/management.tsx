import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Download, Printer, Send, Paperclip } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useOperations } from "./store";
import { Button, Badge, Empty, Filter, Notice, Panel, Tabs, download, useWorkspaceUI } from "./ui";
import { Heading, Stats, usePageQuery } from "./pages";
import { useRecordActions } from "./actions";
import { DEMO_DATE, csv, displayRow, label, type Entry } from "./model";
import { flightStatuses } from "./config";
const palette = ["#cbb992", "#91abbd", "#9fae94", "#b699ab", "#bd9b83", "#8d93b4"];
function aggregate(rows: Entry[], key: (r: Entry) => string) {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(key(r), (counts.get(key(r)) ?? 0) + 1));
  return Array.from(counts, ([name, value]) => ({ name, value }));
}
export function Reports() {
  const {
    state: { data },
    mode,
  } = useOperations();
  const [start, setStart] = useState(DEMO_DATE);
  const [end, setEnd] = useState("2026-10-31");
  const [operator, setOperator] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const rows = data.flights.filter(
    (f) =>
      f.fields["date"]! >= start &&
      f.fields["date"]! <= end &&
      (!operator || f.fields["operator"] === operator) &&
      (!aircraft || f.fields["aircraft"] === aircraft) &&
      (!status || f.status === status) &&
      (!service || displayRow(data, "flights", f).fields["service"] === service),
  );
  const compliance = data.compliance.filter((c) => rows.some((f) => f.id === c.fields["flight"]));
  const charts = [
    {
      title: mode === "operator" ? "Flights by month" : "Flights by day",
      data: aggregate(rows, (f) =>
        mode === "operator" ? f.fields["date"]!.slice(0, 7) : f.fields["date"]!.slice(5),
      ),
      type: "area",
    },
    {
      title: "Flights by service type",
      data: aggregate(rows, (f) => displayRow(data, "flights", f).fields["service"]!),
      type: "pie",
    },
    {
      title: mode === "operator" ? "Quote response performance" : "Flights by operator",
      data:
        mode === "operator"
          ? aggregate(
              data.quotes.filter(
                (q) =>
                  q.fields["date"]! >= start &&
                  q.fields["date"]! <= end &&
                  (!aircraft || q.fields["aircraft"] === aircraft),
              ),
              (q) => q.status,
            )
          : aggregate(rows, (f) => label(data, f, "operator")),
      type: "bar",
    },
    { title: "Flight status distribution", data: aggregate(rows, (f) => f.status), type: "bar" },
    {
      title: "Delay reasons",
      data: aggregate(
        rows.filter((f) => f.status === "Delayed"),
        (f) => f.fields["reason"] || "Reason not recorded",
      ),
      type: "bar",
    },
    {
      title: "Aircraft utilization · assigned legs",
      data: aggregate(rows, (f) => label(data, f, "aircraft").split(" · ")[0]!),
      type: "bar",
    },
    {
      title: mode === "operator" ? "Fleet availability" : "Compliance due-date trend",
      data:
        mode === "operator"
          ? aggregate(
              data.aircraft.filter((a) => !aircraft || a.id === aircraft),
              (a) => a.status,
            )
          : aggregate(
              compliance.filter((c) => c.status !== "Verified"),
              (c) => c.fields["due"]!,
            ),
      type: "bar",
    },
  ];
  const percentage = (n: number, total: number) => `${total ? Math.round((n / total) * 100) : 0}%`;
  return (
    <>
      <Heading
        page="reports"
        description="Understand the fictional workload. Metrics are derived from this workspace's filtered records."
      >
        <Button
          onClick={() =>
            download(
              `viman-${mode}-demo-report.csv`,
              csv([
                ["Flight", "Date", "Route", "Aircraft", "Operator", "Status"],
                ...rows.map((f) => [
                  f.name,
                  f.fields["date"]!,
                  displayRow(data, "flights", f).fields["route"]!,
                  label(data, f, "aircraft"),
                  label(data, f, "operator"),
                  f.status,
                ]),
              ]),
            )
          }
        >
          <Download size={14} /> Export CSV
        </Button>
        <Button onClick={() => window.print()}>
          <Printer size={14} /> Print report
        </Button>
      </Heading>
      <div className="av-filter-bar">
        <label className="av-filter">
          <span>From</span>
          <input
            aria-label="Report start date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="av-filter">
          <span>To</span>
          <input
            aria-label="Report end date"
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        {mode === "operations" && (
          <Filter
            label="Operator"
            value={operator}
            onChange={setOperator}
            values={data.operators.map((o) => ({ value: o.id, label: o.name }))}
          />
        )}
        <Filter
          label="Aircraft"
          value={aircraft}
          onChange={setAircraft}
          values={data.aircraft.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Filter
          label="Flight status"
          value={status}
          onChange={setStatus}
          values={flightStatuses.map((value) => ({ value, label: value }))}
        />
        <Filter
          label="Service type"
          value={service}
          onChange={setService}
          values={["Helicopter", "Private Jet"].map((value) => ({ value, label: value }))}
        />
      </div>
      {end < start && <Notice>End date must be on or after start date.</Notice>}
      <Stats
        items={[
          { label: "Total flights", value: rows.length },
          { label: "Completed", value: rows.filter((f) => f.status === "Completed").length },
          { label: "Delayed", value: rows.filter((f) => f.status === "Delayed").length },
          { label: "Cancelled", value: rows.filter((f) => f.status === "Cancelled").length },
          {
            label: "Aircraft assigned",
            value: percentage(
              new Set(rows.map((f) => f.fields["aircraft"]).filter(Boolean)).size,
              data.aircraft.length,
            ),
            note: "Share of demo fleet",
          },
          {
            label: mode === "operator" ? "Available aircraft" : "Operators utilized",
            value:
              mode === "operator"
                ? data.aircraft.filter((a) => a.status === "Available").length
                : percentage(
                    new Set(rows.map((f) => f.fields["operator"]).filter(Boolean)).size,
                    data.operators.length,
                  ),
          },
          {
            label: "Compliance exceptions",
            value: compliance.filter((c) =>
              ["Exception Open", "Expired", "Escalated"].includes(c.status),
            ).length,
          },
          ...(mode === "operator"
            ? [
                {
                  label: "Pending quotes",
                  value: data.quotes.filter((q) =>
                    ["Draft", "Revision Requested"].includes(q.status),
                  ).length,
                },
              ]
            : []),
        ]}
      />
      <div className="av-grid-2">
        {charts.map((chart) => (
          <Panel
            key={chart.title}
            title={chart.title}
            caption="Fictional records · current filters"
          >
            <div
              className="av-chart"
              role="img"
              aria-label={`${chart.title}: ${chart.data.map((d) => `${d.name} ${d.value}`).join(", ") || "No records"}`}
            >
              {chart.data.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === "area" ? (
                    <AreaChart data={chart.data}>
                      <CartesianGrid stroke="#ffffff09" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#9498a2", fontSize: 9 }} />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#9498a2", fontSize: 9 }}
                        width={25}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1b1d24",
                          border: "1px solid #ffffff20",
                          color: "#eee",
                        }}
                      />
                      <Area
                        dataKey="value"
                        stroke="#cbb992"
                        fill="#cbb99220"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  ) : chart.type === "pie" ? (
                    <PieChart>
                      <Pie
                        data={chart.data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        isAnimationActive={false}
                      >
                        {chart.data.map((d, i) => (
                          <Cell key={d.name} fill={palette[i % palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#1b1d24", border: "1px solid #ffffff20" }}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={chart.data}>
                      <CartesianGrid stroke="#ffffff09" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#9498a2", fontSize: 8 }} interval={0} />
                      <YAxis
                        allowDecimals={false}
                        width={25}
                        tick={{ fill: "#9498a2", fontSize: 9 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1b1d24",
                          border: "1px solid #ffffff20",
                          color: "#eee",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#b6ab8b"
                        maxBarSize={35}
                        isAnimationActive={false}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <Empty
                  title="No data in this range"
                  detail="Adjust filters to see the demo report."
                />
              )}
            </div>
            <div className="px-5 pb-4 flex flex-wrap gap-3">
              {chart.data.map((d, i) => (
                <span key={d.name} className="av-muted">
                  <span style={{ color: palette[i % palette.length] }}>●</span> {d.name}: {d.value}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
interface Message {
  sender: string;
  text: string;
  time: string;
}
export function Messages() {
  const {
    state: { data },
    dispatch,
  } = useOperations();
  const q = usePageQuery();
  const ui = useWorkspaceUI();
  const [selected, setSelected] = useState(
    data.messages.find((m) => m.name === q)?.id ?? data.messages[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [flight, setFlight] = useState("");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState("");
  const thread = data.messages.find((m) => m.id === selected);
  const threads = data.messages.filter(
    (m) =>
      (!flight || m.fields["flight"] === flight) &&
      `${m.name} ${m.fields["messages"]}`.toLowerCase().includes(search.toLowerCase()),
  );
  let messages: Message[] = [];
  try {
    messages = JSON.parse(thread?.fields["messages"] ?? "[]") as Message[];
  } catch {
    /* Corrupt demo content shows an empty conversation. */
  }
  function open(id: string) {
    setSelected(id);
    setDraft("");
    setAttachment("");
    dispatch({
      type: "patch",
      kind: "messages",
      id,
      status: "Read",
      message: "Conversation opened",
    });
  }
  return (
    <>
      <Heading
        page="messages"
        description="Your company's conversations with Viman Operations. All messages remain local."
      />
      <div className="av-filter-bar">
        <label className="av-filter">
          <span>Search messages</span>
          <input
            aria-label="Search messages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Conversation or message…"
          />
        </label>
        <Filter
          label="Flight"
          value={flight}
          values={data.flights.map((f) => ({ value: f.id, label: f.name }))}
          onChange={setFlight}
        />
      </div>
      <Panel title="Operations inbox" caption="Demo conversations · no messages are sent">
        <div className="av-messages">
          <div className="av-thread-list">
            {threads.map((t) => (
              <button
                key={t.id}
                className={t.id === selected ? "active" : ""}
                onClick={() => open(t.id)}
              >
                <strong>{t.name}</strong>
                <div className="mt-2">
                  <Badge>{t.status}</Badge>
                </div>
                <p className="av-muted mt-2">
                  {label(data, t, "flight")} · {t.fields["timestamp"]}
                </p>
                {t.fields["attachment"] && <Paperclip size={12} className="mt-2" />}
              </button>
            ))}
            {!threads.length && <Empty />}
          </div>
          {thread ? (
            <div className="av-conversation">
              <div className="av-panel-head">
                <div>
                  <h2>{thread.name}</h2>
                  <p>{label(data, thread, "flight")}</p>
                </div>
                <Button onClick={() => ui.inspect("flights", thread.fields["flight"]!)}>
                  View flight
                </Button>
              </div>
              <div className="av-message-body">
                {messages.map((m, i) => (
                  <div key={i} className={`av-message ${m.sender === "You" ? "mine" : ""}`}>
                    <small>
                      {m.sender} · {m.time}
                    </small>
                    <p>{m.text}</p>
                  </div>
                ))}
                {thread.fields["attachment"] && (
                  <Button
                    onClick={() =>
                      download(
                        "demo-attachment.txt",
                        "FICTIONAL ATTACHMENT — no operational content",
                        "text/plain",
                      )
                    }
                  >
                    <Paperclip size={13} /> {thread.fields["attachment"]}
                  </Button>
                )}
              </div>
              <form
                className="av-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  const next: Message = {
                    sender: "You",
                    text: draft.trim() + (attachment ? ` [Mock attachment: ${attachment}]` : ""),
                    time:
                      new Date().toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      }) + " · demo",
                  };
                  dispatch({
                    type: "patch",
                    kind: "messages",
                    id: thread.id,
                    status: "Read",
                    fields: { messages: JSON.stringify([...messages, next]) },
                    message: "Mock message saved locally",
                  });
                  setDraft("");
                  setAttachment("");
                  toast.success("Mock message saved locally");
                }}
              >
                <div className="flex-1 min-w-0">
                  <textarea
                    aria-label="Message"
                    placeholder="Write a demo message…"
                    rows={2}
                    required
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full"
                  />
                  <label className="av-muted block mt-2">
                    Mock attachment (filename only)
                    <input
                      className="w-full mt-1"
                      type="file"
                      onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                </div>
                <Button type="submit" primary disabled={!draft.trim()}>
                  <Send size={14} /> Save mock
                </Button>
              </form>
            </div>
          ) : (
            <Empty title="Select a conversation" />
          )}
        </div>
      </Panel>
    </>
  );
}
export function ProfilePage() {
  const {
    state: { data },
    mode,
  } = useOperations();
  const a = useRecordActions();
  const row = data.profile[0];
  const [tab, setTab] = useState("Company Overview");
  if (!row) return <Empty title="No demo profile" />;
  const fields =
    mode === "operations"
      ? ["email", "mobile", "department", "designation", "role", "created"]
      : tab === "Contact Details"
        ? ["contact", "email", "mobile", "address"]
        : tab === "Licensing Information"
          ? ["licence", "aoc", "verification"]
          : tab === "Account Settings"
            ? ["role", "registered", "verification"]
            : ["contact", "service", "address", "licence", "aoc", "verification", "registered"];
  return (
    <>
      <Heading
        page="profile"
        description={
          mode === "operator"
            ? "Company identity and contact information. Verified details remain under Admin review."
            : "Your fictional operations profile. Login details are managed separately."
        }
      />
      <Notice>
        Changes on this page affect the demo profile only. They do not update the logged-in account.
      </Notice>
      {mode === "operator" && (
        <Tabs
          values={[
            "Company Overview",
            "Contact Details",
            "Licensing Information",
            "Account Settings",
          ]}
          selected={tab}
          onChange={setTab}
        />
      )}
      <div className="av-grid-2">
        <Panel
          title={row.name}
          caption={
            mode === "operator" ? "Fictional company account" : "Fictional operations member"
          }
          action={<Badge>{row.status}</Badge>}
        >
          <dl className="av-details">
            {fields.map((key) => (
              <div key={key}>
                <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                <dd>{row.fields[key] ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="p-5 av-actions">
            <Button
              primary
              onClick={() =>
                a.edit(
                  "profile",
                  row,
                  mode === "operator"
                    ? ["contact", "mobile", "email", "address"]
                    : ["name", "mobile", "department", "designation"],
                  "Edit permitted demo details",
                )
              }
            >
              Edit contact details
            </Button>
            {mode === "operator" && (
              <Button
                onClick={() =>
                  a.edit(
                    "profile",
                    row,
                    ["requestedChanges", "notes"],
                    "Request company detail update for Admin review",
                  )
                }
              >
                Request company update
              </Button>
            )}
          </div>
        </Panel>
        <Panel title="Account security" caption="Use the existing secure authentication flow">
          <div className="p-5">
            <p className="av-muted mb-5">
              Password changes are real account actions handled by the existing password reset page.
              This demo does not simulate a successful password change.
            </p>
            <Link to="/reset-password" className="av-button">
              Open secure password form
            </Link>
          </div>
          <div className="p-5 border-t border-white/5">
            <h3 className="mb-2">Role boundaries</h3>
            <p className="av-muted">
              {mode === "operator"
                ? "Company approval and verified licensing changes require Admin review. Other companies' private records are outside this workspace."
                : "Payments, commercial pricing and operational flight-release authority are outside this coordination workspace."}
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
