import { useState } from "react";
import { ArrowUp, ArrowDown, Download, Plus } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Panel, Button, Table, Modal, Select, Field, Badge } from "./ui";
import { audit, downloadCsv } from "./repository";
import {
  type Collection,
  compactMoney,
  dateLabel,
  DEMO_NOW,
  uid,
  isoNow,
  services,
  quoteTotal,
} from "./model";
export function Performance() {
  const { data } = useCrm();
  const ui = useCrmUI();
  const [owner, setOwner] = useState(""),
    [service, setService] = useState(""),
    [detail, setDetail] = useState("");
  const rows = data.team
    .filter((t) => !owner || t.id === owner)
    .map((t) => {
      const leads = data.leads.filter(
        (l) => l.ownerId === t.id && l.status !== "Archived" && (!service || l.service === service),
      );
      const ids = new Set(leads.map((l) => l.id));
      const opp = data.opportunities.filter((o) => ids.has(o.leadId));
      const booked = data.bookings.filter(
        (b) => ids.has(b.leadId) && ["Confirmed", "Completed"].includes(b.status),
      );
      return {
        ...t,
        assigned: leads.length,
        contacted: leads.filter((l) => ["Contacted", "Qualified"].includes(l.status)).length,
        qualified: leads.filter((l) => l.status === "Qualified").length,
        opportunities: opp.length,
        quotes: data.quotations.filter(
          (q) => ids.has(q.leadId) && ["Sent", "Viewed", "Accepted"].includes(q.status),
        ).length,
        bookings: booked.length,
        conversion: leads.length
          ? `${((new Set(booked.map((b) => b.leadId)).size / leads.length) * 100).toFixed(1)}%`
          : "0%",
        pipeline: opp
          .filter((o) => !["Booked", "Lost"].includes(o.stage))
          .reduce((n, o) => n + o.value, 0),
        overdue: data.followups.filter(
          (f) =>
            ids.has(f.leadId) &&
            Date.parse(f.due) < Date.parse(DEMO_NOW) &&
            f.status !== "Completed",
        ).length,
        response: leads.length
          ? Math.round(leads.reduce((n, l) => n + l.responseMinutes, 0) / leads.length)
          : 0,
        revenue: booked.reduce((n, b) => n + b.value, 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  return (
    <>
      <div className="crm-filterbar">
        <select
          aria-label="Sales representative"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">Entire team</option>
          {data.team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Select
          label="Service filter"
          value={service}
          onChange={setService}
          options={services}
          all="All services"
        />
      </div>
      <div className="crm-three-col">
        {rows.slice(0, 3).map((t, i) => (
          <Panel key={t.id}>
            <small>#{i + 1} · BOOKING VALUE</small>
            <h2>{t.name}</h2>
            <strong className="crm-big-number">{compactMoney(t.revenue)}</strong>
            <p>
              {t.bookings} bookings · {t.conversion} conversion
            </p>
          </Panel>
        ))}
      </div>
      <Table
        rows={rows}
        label="sales performance"
        onOpen={(t) => setDetail(t.id)}
        columns={[
          { key: "name", label: "Representative" },
          { key: "assigned", label: "Assigned" },
          { key: "contacted", label: "Contacted" },
          { key: "qualified", label: "Qualified" },
          { key: "opportunities", label: "Opportunities" },
          { key: "quotes", label: "Quotes sent" },
          { key: "bookings", label: "Bookings" },
          { key: "conversion", label: "Conversion" },
          { key: "pipeline", label: "Pipeline value", render: (t) => compactMoney(t.pipeline) },
          { key: "overdue", label: "Overdue" },
          { key: "response", label: "Avg response (min)" },
        ]}
      />
      <Panel title="Service-wise team comparison">
        <Table
          rows={services.map((service) => ({
            id: service,
            name: service,
            ...Object.fromEntries(
              data.team
                .filter((t) => !owner || t.id === owner)
                .map((t) => [
                  t.id,
                  data.leads.filter(
                    (l) => l.ownerId === t.id && l.service === service && l.status !== "Archived",
                  ).length,
                ]),
            ),
          }))}
          columns={[
            { key: "name", label: "Service" },
            ...data.team
              .filter((t) => !owner || t.id === owner)
              .map((t) => ({ key: t.id, label: t.name })),
          ]}
          label="service comparison"
        />
      </Panel>
      {detail && (
        <Modal
          title={data.team.find((t) => t.id === detail)!.name}
          onClose={() => setDetail("")}
          wide
        >
          <Panel title="Campaign attribution">
            <Table
              rows={data.campaigns.map((c) => ({
                id: c.id,
                name: c.name,
                leads: data.leads.filter(
                  (l) =>
                    l.ownerId === detail &&
                    l.campaignId === c.id &&
                    (!service || l.service === service),
                ).length,
              }))}
              columns={[
                { key: "name", label: "Campaign" },
                { key: "leads", label: "Assigned leads" },
              ]}
              label="campaign attribution"
            />
          </Panel>
          <Panel title="Lead activity by week">
            <Table
              rows={[1, 2, 3, 4, 5, 6].map((w) => ({
                id: String(w),
                name: `Week ${w}`,
                leads: data.leads.filter(
                  (l) =>
                    l.ownerId === detail &&
                    Math.ceil((Date.parse(l.createdAt) - Date.parse("2026-09-01")) / 604800000) ===
                      w,
                ).length,
              }))}
              columns={[
                { key: "name", label: "Week" },
                { key: "leads", label: "Leads" },
              ]}
              label="performance trend"
            />
          </Panel>
        </Modal>
      )}
    </>
  );
}
const exportCollections: Collection[] = [
  "leads",
  "customers",
  "opportunities",
  "enquiries",
  "quotations",
  "bookings",
  "campaigns",
  "followups",
];
export function Exports() {
  const { data, mutate } = useCrm();
  const [kind, setKind] = useState<Collection>("leads"),
    [columns, setColumns] = useState<string[]>(["name", "status", "service"]),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [scope, setScope] = useState("All records"),
    [status, setStatus] = useState("");
  const rows = (data[kind] as unknown as Record<string, unknown>[]).filter(
    (r) =>
      (!from || String(r["createdAt"]).slice(0, 10) >= from) &&
      (!to || String(r["createdAt"]).slice(0, 10) <= to) &&
      (scope !== "Current filters" || !status || r["status"] === status),
  );
  const available = Object.keys(data[kind][0] ?? {}).filter(
    (k) =>
      ![
        "items",
        "notes",
        "body",
        "text",
        "consent",
        "sourceHistory",
        "configuration",
        "sourceMetadata",
      ].includes(k),
  );
  return (
    <>
      <Panel title="Create an export">
        <div className="crm-form-grid crm-pad">
          <Field label="Record type">
            <select
              value={kind}
              onChange={(e) => {
                const key = e.target.value as Collection;
                setKind(key);
                setColumns(
                  Object.keys(data[key][0] ?? {}).filter((k) =>
                    ["name", "status", "service", "value", "title"].includes(k),
                  ),
                );
              }}
            >
              {exportCollections.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="File format">
            <select>
              <option>CSV (UTF-8)</option>
            </select>
          </Field>
          <Field label="From date">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To date">
            <input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Export scope">
            <Select
              label="Export scope"
              value={scope}
              onChange={setScope}
              options={["All records", "Current filters"]}
            />
          </Field>
          {scope === "Current filters" && (
            <Field label="Status filter">
              <Select
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  ...new Set(
                    (data[kind] as unknown as Record<string, unknown>[]).map((r) =>
                      String(r["status"] ?? ""),
                    ),
                  ),
                ].filter(Boolean)}
                all="All statuses"
              />
            </Field>
          )}
        </div>
        <div className="crm-pad">
          <h3>Select columns</h3>
          <p className="crm-muted">
            Contact fields are excluded by default. Select only what you need. No document contents
            are exported.
          </p>
          <div className="crm-filterbar">
            {available.map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={columns.includes(k)}
                  onChange={(e) =>
                    setColumns((c) => (e.target.checked ? [...c, k] : c.filter((x) => x !== k)))
                  }
                />{" "}
                {k}
              </label>
            ))}
          </div>
          <Button
            className="primary"
            disabled={!columns.length || !rows.length}
            onClick={() => {
              downloadCsv(kind, rows, columns);
              void mutate((d) => {
                d.exports.unshift({
                  id: uid(),
                  createdAt: isoNow(),
                  name: kind,
                  rows: rows.length,
                  columns: columns.join(", "),
                  scope,
                });
                audit(
                  d,
                  "Export Created",
                  "exports",
                  kind,
                  `${rows.length} rows, ${columns.length} columns.`,
                );
              }, "CSV prepared");
            }}
          >
            <Download size={16} />
            Export {rows.length} rows
          </Button>
          <a href="/crm/reports" className="crm-btn">
            Export sales reports
          </a>
        </div>
      </Panel>
      <Table
        rows={data.exports}
        label="export history"
        columns={[
          { key: "name", label: "Export type" },
          { key: "rows", label: "Rows" },
          { key: "columns", label: "Columns" },
          { key: "scope", label: "Scope" },
          { key: "createdAt", label: "Created", render: (e) => dateLabel(e.createdAt) },
        ]}
      />
    </>
  );
}
export function Settings() {
  const { data, mutate, failNext } = useCrm();
  const [tab, setTab] = useState("General"),
    [newValue, setNewValue] = useState(""),
    [workspace, setWorkspace] = useState(data.settings.workspace);
  const tabs = [
    "General",
    "Lead Sources",
    "Lead Statuses",
    "Pipeline Stages",
    "Priorities",
    "Assignment Rules",
    "Sales Teams",
    "Custom Fields",
    "Notifications",
    "Integrations",
    "Permissions",
    "Data Management",
  ];
  const keys = {
    "Lead Sources": "sources",
    "Lead Statuses": "statuses",
    "Pipeline Stages": "stages",
    Priorities: "priorities",
    "Custom Fields": "customFields",
  } as const;
  const key = keys[tab as keyof typeof keys];
  const setting = (fn: (d: typeof data) => void) =>
    void mutate((d) => {
      fn(d);
      audit(d, "Settings Changed", "settings", tab, `${tab} preferences updated locally.`);
    });
  return (
    <div className="crm-settings">
      <aside>
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              setNewValue("");
            }}
          >
            {t}
          </button>
        ))}
      </aside>
      <Panel title={tab}>
        <div className="crm-pad">
          {key ? (
            <>
              <p>
                Changes apply throughout this mock workspace. Existing linked records are updated
                when labels change.
              </p>
              {data.settings[key].map((value, i) => (
                <div className="crm-setting-row" key={`${key}-${i}`}>
                  <input
                    aria-label={`Edit ${value}`}
                    defaultValue={value}
                    key={value}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (!next || next === value) return;
                      if (data.settings[key].includes(next)) {
                        e.target.value = value;
                        return;
                      }
                      if (key === "stages" && ["Booked", "Lost"].includes(value)) {
                        e.target.value = value;
                        return;
                      }
                      setting((d) => {
                        d.settings[key][i] = next;
                        if (key === "stages")
                          d.opportunities
                            .filter((o) => o.stage === value)
                            .forEach((o) => (o.stage = next));
                        if (key === "sources")
                          d.leads
                            .filter((l) => l.source === value)
                            .forEach((l) => (l.source = next));
                        if (key === "statuses")
                          d.leads
                            .filter((l) => l.status === value)
                            .forEach((l) => (l.status = next));
                        if (key === "priorities") {
                          d.leads
                            .filter((l) => l.priority === value)
                            .forEach((l) => (l.priority = next));
                          d.tasks
                            .filter((t) => t.priority === value)
                            .forEach((t) => (t.priority = next));
                          d.followups
                            .filter((t) => t.priority === value)
                            .forEach((t) => (t.priority = next));
                        }
                      });
                    }}
                    readOnly={key === "stages" && ["Booked", "Lost"].includes(value)}
                  />
                  <Button
                    aria-label={`Move ${value} up`}
                    disabled={i === 0}
                    onClick={() =>
                      setting((d) => {
                        const a = d.settings[key];
                        [a[i - 1], a[i]] = [a[i]!, a[i - 1]!];
                      })
                    }
                  >
                    <ArrowUp size={15} />
                  </Button>
                  <Button
                    aria-label={`Move ${value} down`}
                    disabled={i === data.settings[key].length - 1}
                    onClick={() =>
                      setting((d) => {
                        const a = d.settings[key];
                        [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
                      })
                    }
                  >
                    <ArrowDown size={15} />
                  </Button>
                </div>
              ))}
              {key === "stages" && (
                <small>
                  Booked and Lost are reserved outcome stages; labels remain fixed to preserve
                  reporting semantics.
                </small>
              )}
              <div className="crm-filterbar">
                <input
                  placeholder="New label"
                  aria-label="New setting label"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
                <Button
                  disabled={!newValue.trim() || data.settings[key].includes(newValue.trim())}
                  onClick={() => {
                    setting((d) => d.settings[key].push(newValue.trim()));
                    setNewValue("");
                  }}
                >
                  Add
                </Button>
              </div>
            </>
          ) : tab === "General" ? (
            <>
              <Field label="Workspace name">
                <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
              </Field>
              <Field label="Theme">
                <Select
                  label="Theme"
                  value={data.settings.theme}
                  onChange={(v) =>
                    setting((d) => {
                      d.settings.theme = v;
                    })
                  }
                  options={["light", "dark"]}
                />
              </Field>
              <Button
                disabled={!workspace.trim()}
                onClick={() =>
                  setting((d) => {
                    d.settings.workspace = workspace;
                  })
                }
              >
                Save preferences
              </Button>
            </>
          ) : tab === "Assignment Rules" ? (
            <>
              <p>Assignment methods run only when you apply them on the Assignments page.</p>
              <Select
                label="Default assignment method"
                value={data.settings.assignment}
                onChange={(v) =>
                  setting((d) => {
                    d.settings.assignment = v;
                  })
                }
                options={[
                  "Manual",
                  "Round Robin",
                  "Service-Based",
                  "Region-Based",
                  "Campaign-Based",
                ]}
              />
              <a href="/crm/assignments" className="crm-btn">
                Review and apply rules
              </a>
            </>
          ) : tab === "Sales Teams" ? (
            <Table
              rows={data.team}
              label="sales team"
              columns={[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "service", label: "Specialty" },
                { key: "region", label: "Region" },
              ]}
            />
          ) : tab === "Notifications" ? (
            <label>
              <input
                type="checkbox"
                checked={data.settings.notifications}
                onChange={(e) =>
                  setting((d) => {
                    d.settings.notifications = e.target.checked;
                  })
                }
              />{" "}
              Show local notification indicators
            </label>
          ) : tab === "Integrations" ? (
            <>
              <p>Configure provider mappings and review future connection requirements.</p>
              <a href="/crm/integrations" className="crm-btn">
                Manage integrations
              </a>
            </>
          ) : tab === "Permissions" ? (
            <>
              <h3>Permission preview</h3>
              <p>{data.settings.permissions}</p>
              <p>
                Frontend controls do not enforce backend authorization. Real CRM permissions will
                require authenticated server policies in a later phase.
              </p>
              <Table
                rows={[
                  {
                    id: "admin",
                    role: "Admin",
                    capability: "Manage workspace, assignment rules, reports and configuration",
                  },
                  {
                    id: "sales",
                    role: "Sales",
                    capability: "Manage leads, opportunities, quotations and follow-ups",
                  },
                ]}
                columns={[
                  { key: "role", label: "Planned role" },
                  { key: "capability", label: "Planned capabilities" },
                ]}
              />
            </>
          ) : (
            <>
              <h3>Local data controls</h3>
              <p>
                This workspace uses this browser’s local storage. It contains sample records, drafts
                and local audit events.
              </p>
              <a href="/crm/exports" className="crm-btn">
                Export local records
              </a>
              <Button onClick={failNext}>Simulate next save failure</Button>
              <p className="crm-muted">
                Use the failure simulation to verify optimistic update rollback. No live data is
                affected.
              </p>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
export function AuditLogs() {
  const { data } = useCrm();
  const [actor, setActor] = useState(""),
    [action, setAction] = useState(""),
    [entity, setEntity] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  return (
    <>
      <p className="crm-notice">
        Local interaction history for this demo. This is not a tamper-proof security audit log.
      </p>
      <div className="crm-filterbar">
        <Select
          label="Actor"
          value={actor}
          onChange={setActor}
          options={[...new Set(data.audit.map((a) => a.actor))]}
          all="All actors"
        />
        <Select
          label="Action"
          value={action}
          onChange={setAction}
          options={[...new Set(data.audit.map((a) => a.action))]}
          all="All actions"
        />
        <Select
          label="Entity"
          value={entity}
          onChange={setEntity}
          options={[...new Set(data.audit.map((a) => a.entity))]}
          all="All entities"
        />
        <input
          aria-label="Audit from date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          aria-label="Audit to date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Table
        rows={data.audit.filter(
          (a) =>
            (!actor || a.actor === actor) &&
            (!action || a.action === action) &&
            (!entity || a.entity === entity) &&
            (!from || a.createdAt.slice(0, 10) >= from) &&
            (!to || a.createdAt.slice(0, 10) <= to),
        )}
        label="audit events"
        columns={[
          {
            key: "createdAt",
            label: "Timestamp",
            render: (a) => new Date(a.createdAt).toLocaleString("en-IN"),
          },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Action" },
          { key: "entity", label: "Entity type" },
          { key: "entityId", label: "Entity ID" },
          { key: "description", label: "Description" },
        ]}
      />
    </>
  );
}
