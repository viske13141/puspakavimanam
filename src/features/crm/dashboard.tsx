import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Users,
  UserPlus,
  UserRoundCheck,
  BriefcaseBusiness,
  Wallet,
  Plane,
  TrendingUp,
  CalendarClock,
  Clock,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Panel, Badge, Button, Select, Table } from "./ui";
import { DEMO_NOW, compactMoney, dateLabel, services, type CrmLead } from "./model";
import { downloadCsv } from "./repository";
const palette = [
  "#b29a66",
  "#263b45",
  "#86a597",
  "#d6c8a6",
  "#73899a",
  "#be9984",
  "#acb6ac",
  "#536965",
];
export function Dashboard({
  analytics = false,
  report = false,
}: {
  analytics?: boolean;
  report?: boolean;
}) {
  const { data } = useCrm();
  const ui = useCrmUI();
  const [period, setPeriod] = useState("Last 30 Days"),
    [service, setService] = useState(""),
    [owner, setOwner] = useState(""),
    [source, setSource] = useState(""),
    [from, setFrom] = useState("2026-09-12"),
    [to, setTo] = useState("2026-10-12"),
    [granularity, setGranularity] = useState("Daily"),
    [reportType, setReportType] = useState("Lead Source Report");
  const end =
    period === "Custom Date Range"
      ? new Date(`${to}T23:59:59+05:30`).getTime()
      : new Date("2026-10-12T23:59:59+05:30").getTime();
  const start =
    period === "Custom Date Range"
      ? new Date(`${from}T00:00:00+05:30`).getTime()
      : period === "This Month"
        ? new Date("2026-10-01T00:00:00+05:30").getTime()
        : end - (period === "Today" ? 1 : period === "Last 7 Days" ? 7 : 30) * 86400000 + 1;
  const segment = (l: CrmLead) =>
    l.status !== "Archived" &&
    (!service || l.service === service) &&
    (!owner || l.ownerId === owner) &&
    (!source || l.source === source);
  const leads = data.leads.filter(
    (l) => segment(l) && Date.parse(l.createdAt) >= start && Date.parse(l.createdAt) <= end,
  );
  const previous = data.leads.filter(
    (l) =>
      segment(l) &&
      Date.parse(l.createdAt) >= start - (end - start + 1) &&
      Date.parse(l.createdAt) < start,
  );
  const ids = new Set(leads.map((l) => l.id));
  const opps = data.opportunities.filter((o) => ids.has(o.leadId));
  const bookings = data.bookings.filter(
    (b) => ids.has(b.leadId) && ["Confirmed", "Completed"].includes(b.status),
  );
  const followups = data.followups.filter((f) => ids.has(f.leadId));
  const tasks = data.tasks.filter((t) => ids.has(t.leadId));
  const pipeline = opps.filter((o) => !["Booked", "Lost"].includes(o.stage));
  const revenue = bookings.reduce((n, b) => n + b.value, 0);
  const overdue = followups.filter(
    (f) => f.status !== "Completed" && Date.parse(f.due) < Date.parse(DEMO_NOW),
  );
  const conversion = leads.length
    ? (new Set(bookings.map((b) => b.leadId)).size / leads.length) * 100
    : 0;
  const sourceData = data.settings.sources.map((name) => ({
    name,
    value: leads.filter((l) => l.source === name).length,
  }));
  const stageData = data.settings.stages.map((name) => ({
    name,
    value: opps.filter((o) => o.stage === name).length,
    amount: opps.filter((o) => o.stage === name).reduce((n, o) => n + o.value, 0),
  }));
  const buckets = new Map<string, { name: string; leads: number; bookings: number }>();
  leads.forEach((l) => {
    const d = new Date(l.createdAt);
    const key =
      granularity === "Monthly"
        ? l.createdAt.slice(0, 7)
        : granularity === "Weekly"
          ? `Week ${Math.ceil(d.getUTCDate() / 7)} · ${d.getUTCMonth() + 1}`
          : l.createdAt.slice(0, 10);
    const b = buckets.get(key) ?? { name: key, leads: 0, bookings: 0 };
    b.leads++;
    b.bookings += bookings.filter((x) => x.leadId === l.id).length;
    buckets.set(key, b);
  });
  const timeline = [...buckets.values()].sort((a, b) => a.name.localeCompare(b.name));
  const metric = (ls: CrmLead[], index: number) => {
    const set = new Set(ls.map((l) => l.id));
    const os = data.opportunities.filter((o) => set.has(o.leadId));
    const bs = data.bookings.filter(
      (b) => set.has(b.leadId) && ["Confirmed", "Completed"].includes(b.status),
    );
    switch (index) {
      case 0:
        return ls.length;
      case 1:
        return ls.filter((l) => l.status === "New").length;
      case 2:
        return ls.filter((l) => l.status === "Qualified").length;
      case 3:
        return os.filter((o) => !["Booked", "Lost"].includes(o.stage)).length;
      case 4:
        return os
          .filter((o) => !["Booked", "Lost"].includes(o.stage))
          .reduce((s, o) => s + o.value, 0);
      case 5:
        return bs.length;
      case 6:
        return ls.length ? (new Set(bs.map((b) => b.leadId)).size / ls.length) * 100 : 0;
      case 7:
        return data.followups.filter(
          (f) =>
            set.has(f.leadId) &&
            f.status !== "Completed" &&
            Date.parse(f.due) < Date.parse(DEMO_NOW),
        ).length;
      case 8:
        return ls.length ? ls.reduce((s, l) => s + l.responseMinutes, 0) / ls.length : 0;
      default:
        return bs.reduce((s, b) => s + b.value, 0);
    }
  };
  const cards = [
    ["Total leads", leads.length, Users],
    ["New leads", leads.filter((l) => l.status === "New").length, UserPlus],
    ["Qualified leads", leads.filter((l) => l.status === "Qualified").length, UserRoundCheck],
    ["Active opportunities", pipeline.length, BriefcaseBusiness],
    ["Pipeline value", compactMoney(pipeline.reduce((n, o) => n + o.value, 0)), Wallet],
    ["Confirmed bookings", bookings.length, Plane],
    ["Conversion rate", `${conversion.toFixed(1)}%`, TrendingUp],
    ["Overdue follow-ups", overdue.length, CalendarClock],
    ["Avg. first response", `${Math.round(metric(leads, 8))} min`, Clock],
    ["Booking value", compactMoney(revenue), Wallet],
  ] as const;
  const campaigns = data.campaigns
    .map((c) => {
      const ls = leads.filter((l) => l.campaignId === c.id);
      return {
        id: c.id,
        name: c.name,
        leads: ls.length,
        qualified: ls.filter((l) => l.status === "Qualified").length,
        bookings: bookings.filter((b) => ls.some((l) => l.id === b.leadId)).length,
        revenue: bookings
          .filter((b) => ls.some((l) => l.id === b.leadId))
          .reduce((s, b) => s + b.value, 0),
      };
    })
    .filter((c) => c.leads)
    .sort((a, b) => b.leads - a.leads);
  const reports = [
    "Lead Source Report",
    "Lead Conversion Report",
    "Sales Pipeline Report",
    "Booking Report",
    "Revenue Report",
    "Campaign Performance Report",
    "Sales Activity Report",
    "Follow-up Compliance Report",
    "Lost Lead Analysis",
    "Customer Retention Report",
  ];
  const reportRows: Record<string, string | number>[] =
    reportType === "Lead Source Report"
      ? sourceData
      : reportType === "Sales Pipeline Report"
        ? stageData
        : reportType === "Campaign Performance Report"
          ? campaigns
          : reportType === "Lost Lead Analysis"
            ? opps
                .filter((o) => o.stage === "Lost")
                .map((o) => ({ name: o.name, reason: o.lossReason, value: o.value }))
            : reportType === "Follow-up Compliance Report"
              ? followups.map((f) => ({ name: f.title, status: f.status, due: f.due }))
              : reportType === "Sales Activity Report"
                ? data.activities
                    .filter((a) => ids.has(a.leadId))
                    .map((a) => ({ name: a.action, date: a.createdAt, actor: a.actor }))
                : reportType === "Customer Retention Report"
                  ? data.customers
                      .filter((c) => leads.some((l) => l.customerId === c.id))
                      .map((c) => ({
                        name: c.name,
                        bookings: bookings.filter((b) => b.customerId === c.id).length,
                      }))
                  : reportType === "Lead Conversion Report"
                    ? leads.map((l) => ({
                        name: l.name,
                        status: l.status,
                        booked: bookings.some((b) => b.leadId === l.id) ? 1 : 0,
                      }))
                    : bookings.map((b) => ({
                        name: b.name,
                        status: b.status,
                        value: b.value,
                        service: b.service,
                      }));
  return (
    <>
      <div className="crm-page-heading">
        <div>
          <p className="crm-eyebrow">YOUR BUSINESS, AT A GLANCE</p>
          <h1>{report ? "Reports" : analytics ? "Analytics overview" : "A higher perspective."}</h1>
          <p>
            {report
              ? "Explore performance across the complete customer journey."
              : analytics
                ? "Turn relationships into insight. Every number shares one source of truth."
                : "Welcome back. Here’s what’s happening across your sales workspace."}
          </p>
        </div>
        <div className="crm-actions">
          <Button
            onClick={() =>
              downloadCsv(
                "overview",
                cards.map(([metric, value]) => ({ metric, value })),
                ["metric", "value"],
              )
            }
          >
            <Download size={16} />
            Export overview
          </Button>
          <Button className="primary" onClick={() => ui.form({ kind: "leads" })}>
            ＋ Add lead
          </Button>
        </div>
      </div>
      <div className="crm-filterbar">
        <Select
          label="Period"
          value={period}
          onChange={setPeriod}
          options={["Today", "Last 7 Days", "Last 30 Days", "This Month", "Custom Date Range"]}
        />
        {period === "Custom Date Range" && (
          <>
            <input
              aria-label="From date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              aria-label="To date"
              type="date"
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </>
        )}
        <Select
          label="Service"
          value={service}
          onChange={setService}
          options={services}
          all="All services"
        />
        <select aria-label="Sales owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All sales owners</option>
          {data.team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Select
          label="Source"
          value={source}
          onChange={setSource}
          options={data.settings.sources}
          all="All sources"
        />
        <span className="crm-filter-note">Lead cohort · sample data</span>
      </div>
      <div className="crm-kpis">
        {cards.map(([label, value, Icon], i) => {
          const prev = metric(previous, i),
            now = metric(leads, i);
          return (
            <Panel key={label}>
              <div className="crm-kpi-label">
                {label}
                <Icon size={17} />
              </div>
              <strong>{value}</strong>
              <div className="crm-kpi-trend">
                <span>
                  {prev
                    ? `${now >= prev ? "+" : ""}${(((now - prev) / prev) * 100).toFixed(0)}%`
                    : "—"}
                </span>
                <small>vs. previous period</small>
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="crm-chart-grid">
        <Panel
          title="Lead acquisition"
          action={
            <Select
              label="Chart interval"
              value={granularity}
              onChange={setGranularity}
              options={["Daily", "Weekly", "Monthly"]}
            />
          }
        >
          <div className="crm-chart-subtitle">
            <strong>{leads.length}</strong>
            <span>leads in selected period</span>
            <span className="crm-legend">
              <i /> New enquiries
            </span>
          </div>
          <div className="crm-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="crm-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b29a66" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#b29a66" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#a0a0a025" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  minTickGap={30}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#af9460"
                  strokeWidth={2.5}
                  fill="url(#crm-area)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Where leads come from"
          action={
            <Link to="/crm/analytics" className="crm-text-link">
              <ArrowUpRight size={17} />
            </Link>
          }
        >
          <div className="crm-donut">
            <ResponsiveContainer width="100%" height={205}>
              <PieChart>
                <Pie
                  data={sourceData.filter((s) => s.value)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {sourceData
                    .filter((s) => s.value)
                    .map((s, i) => (
                      <Cell key={s.name} fill={palette[i % 8]} />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="crm-donut-center">
              <strong>{leads.length}</strong>
              <small>Total leads</small>
            </div>
          </div>
          <div className="crm-source-legend">
            {sourceData.map((s, i) => (
              <div key={s.name}>
                <i style={{ background: palette[i % 8] }} />
                <span>{s.name}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="crm-two-col">
        <Panel
          title="Sales pipeline"
          action={
            <Link to="/crm/pipeline" className="crm-text-link">
              View pipeline ↗
            </Link>
          }
        >
          <div className="crm-pipeline-summary">
            {stageData.map((s, i) => (
              <div key={s.name}>
                <span>{s.name}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(2, (s.value / Math.max(1, ...stageData.map((x) => x.value))) * 100)}%`,
                      background: palette[i % 8],
                    }}
                  />
                </div>
                <strong>{s.value}</strong>
                <small>{compactMoney(s.amount)}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Today’s priorities"
          action={
            <Link to="/crm/followups" className="crm-text-link">
              View all ↗
            </Link>
          }
        >
          <div className="crm-priority-summary">
            <CalendarClock size={20} />
            <div>
              <strong>{overdue.length} follow-ups need your attention</strong>
              <small>Keep every conversation moving forward.</small>
            </div>
          </div>
          {followups
            .filter((f) => f.status !== "Completed")
            .slice(0, 4)
            .map((f) => (
              <button key={f.id} className="crm-widget-row" onClick={() => ui.lead(f.leadId)}>
                <span className="crm-avatar small">
                  {data.leads.find((l) => l.id === f.leadId)?.name.slice(0, 1)}
                </span>
                <span>
                  <strong>{data.leads.find((l) => l.id === f.leadId)?.name}</strong>
                  <small>
                    {f.title} · {dateLabel(f.due)}
                  </small>
                </span>
                <Badge>{Date.parse(f.due) < Date.parse(DEMO_NOW) ? "Overdue" : f.priority}</Badge>
              </button>
            ))}
        </Panel>
      </div>
      <Panel
        title="Recent leads"
        action={
          <Link to="/crm/leads" className="crm-text-link">
            All leads ↗
          </Link>
        }
      >
        <Table
          rows={[...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)}
          columns={[
            {
              key: "name",
              label: "Contact",
              render: (l) => (
                <span className="crm-contact">
                  <span className="crm-avatar small">{l.name[0]}</span>
                  <span>
                    {l.name}
                    <small>{l.company}</small>
                  </span>
                </span>
              ),
            },
            { key: "service", label: "Service interest" },
            { key: "source", label: "Source" },
            { key: "status", label: "Status", render: (l) => <Badge>{l.status}</Badge> },
            {
              key: "value",
              label: "Est. value",
              value: (l) => l.value,
              render: (l) => compactMoney(l.value),
            },
          ]}
          onOpen={(l) => ui.lead(l.id)}
          label="recent leads"
        />
      </Panel>
      <div className="crm-three-col">
        <Panel title="Bookings by service">
          <div className="crm-chart short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={services.map((name) => ({
                  name,
                  value: bookings.filter((b) => b.service === name).length,
                }))}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} width={22} />
                <Tooltip />
                <Bar dataKey="value" fill="#829c8d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Conversion trend">
          <div className="crm-chart short">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeline.map((t) => ({
                  ...t,
                  conversion: t.leads ? (t.bookings / t.leads) * 100 : 0,
                }))}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis unit="%" width={40} />
                <Tooltip />
                <Area dataKey="conversion" stroke="#b29a66" fill="#b29a6620" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Opportunity value by stage">
          <div className="crm-chart short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                <YAxis tickFormatter={compactMoney} width={55} tick={{ fontSize: 9 }} />
                <Tooltip formatter={compactMoney} />
                <Bar dataKey="amount" fill="#73899a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="crm-three-col">
        {[
          [
            "Overdue tasks",
            tasks
              .filter((t) => t.status !== "Completed" && Date.parse(t.due) < Date.parse(DEMO_NOW))
              .map((t) => ({ id: t.id, title: t.title, sub: dateLabel(t.due), leadId: t.leadId })),
          ],
          [
            "Upcoming meetings",
            tasks
              .filter((t) => t.type === "Meeting" && Date.parse(t.due) >= Date.parse(DEMO_NOW))
              .map((t) => ({ id: t.id, title: t.title, sub: dateLabel(t.due), leadId: t.leadId })),
          ],
          [
            "Pending quotations",
            data.quotations
              .filter(
                (q) =>
                  ids.has(q.leadId) && ["Draft", "Pending Approval", "Sent"].includes(q.status),
              )
              .map((q) => ({ id: q.id, title: q.name, sub: q.status, leadId: q.leadId })),
          ],
          [
            "Recently confirmed bookings",
            bookings.map((b) => ({ id: b.id, title: b.name, sub: b.route, leadId: b.leadId })),
          ],
          [
            "Recent activities",
            data.activities
              .filter((a) => ids.has(a.leadId))
              .map((a) => ({
                id: a.id,
                title: a.action,
                sub: dateLabel(a.createdAt),
                leadId: a.leadId,
              })),
          ],
        ].map(([title, rows]) => (
          <Panel key={String(title)} title={String(title)}>
            {(rows as { id: string; title: string; sub: string; leadId: string }[])
              .slice(0, 4)
              .map((r) => (
                <button key={r.id} className="crm-widget-row" onClick={() => ui.lead(r.leadId)}>
                  <span>
                    <strong>{r.title}</strong>
                    <small>{r.sub}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {!(rows as unknown[]).length && (
              <p className="crm-pad crm-muted">No records in this cohort.</p>
            )}
          </Panel>
        ))}
        <Panel title="Top campaigns">
          {campaigns.slice(0, 4).map((c) => (
            <Link to="/crm/campaigns" className="crm-widget-row" key={c.id}>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.bookings} bookings · {compactMoney(c.revenue)}
                </small>
              </span>
              <Badge>{c.leads} leads</Badge>
            </Link>
          ))}
        </Panel>
        <Panel title="Top sales representatives">
          {data.team
            .map((t) => ({ ...t, count: bookings.filter((b) => b.ownerId === t.id).length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)
            .map((t) => (
              <Link to="/crm/performance" key={t.id} className="crm-widget-row">
                <strong>{t.name}</strong>
                <Badge>{t.count} bookings</Badge>
              </Link>
            ))}
        </Panel>
      </div>
      {report && (
        <Panel
          title="Report explorer"
          action={<Button onClick={() => window.print()}>Print report</Button>}
        >
          <div className="crm-filterbar">
            <Select
              label="Report category"
              value={reportType}
              onChange={setReportType}
              options={reports}
            />
          </div>
          <Table
            label={reportType}
            rows={reportRows.map((r, i) => ({ ...r, id: String(i) }))}
            columns={Object.keys(reportRows[0] ?? { name: "" })
              .filter((k) => k !== "id")
              .map((key) => ({ key, label: key }))}
          />
        </Panel>
      )}
    </>
  );
}
