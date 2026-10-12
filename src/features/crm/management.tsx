import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, Plug, CheckCircle, Copy, Users } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Panel, Table, Badge, Button, Modal, Field, Select, Empty } from "./ui";
import { audit, assignLead, duplicates, mergeLeads, downloadCsv } from "./repository";
import {
  type CrmCampaign,
  type CrmIntegration,
  dateLabel,
  money,
  compactMoney,
  DEMO_NOW,
  uid,
  isoNow,
} from "./model";
export function Assignments() {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [tab, setTab] = useState("Unassigned"),
    [selected, setSelected] = useState<string[]>([]),
    [owner, setOwner] = useState(""),
    [method, setMethod] = useState(data.settings.assignment);
  return (
    <>
      <div className="crm-team-grid">
        {data.team.map((t) => {
          const leads = data.leads.filter((l) => l.ownerId === t.id && l.status !== "Archived");
          return (
            <Panel key={t.id}>
              <span className="crm-avatar">
                {t.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </span>
              <h3>{t.name}</h3>
              <small>
                {t.service} · {t.region}
              </small>
              <div className="crm-workload">
                <span>{leads.length} leads</span>
                <span>
                  {
                    data.opportunities.filter(
                      (o) => o.ownerId === t.id && !["Lost", "Booked"].includes(o.stage),
                    ).length
                  }{" "}
                  active opportunities
                </span>
                <span>
                  {
                    data.followups.filter(
                      (f) => f.ownerId === t.id && f.due < DEMO_NOW && f.status !== "Completed",
                    ).length
                  }{" "}
                  overdue
                </span>
              </div>
              <progress max={20} value={leads.length} />
            </Panel>
          );
        })}
      </div>
      <div className="crm-tabs">
        {["Unassigned", "Assigned", "Assignment history"].map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Assignment history" ? (
        <Table
          rows={data.assignments}
          label="assignment history"
          columns={[
            {
              key: "leadId",
              label: "Lead",
              value: (a) => data.leads.find((l) => l.id === a.leadId)?.name ?? "",
            },
            {
              key: "ownerId",
              label: "Assigned to",
              value: (a) => data.team.find((t) => t.id === a.ownerId)?.name ?? "Unassigned",
            },
            {
              key: "previousOwnerId",
              label: "Previous owner",
              value: (a) => data.team.find((t) => t.id === a.previousOwnerId)?.name ?? "Unassigned",
            },
            { key: "method", label: "Method" },
            { key: "createdAt", label: "Date", render: (a) => dateLabel(a.createdAt) },
          ]}
        />
      ) : (
        <>
          <div className="crm-filterbar">
            <Select
              label="Assignment method"
              value={method}
              onChange={setMethod}
              options={["Manual", "Round Robin", "Service-Based", "Region-Based", "Campaign-Based"]}
            />
            <select aria-label="Assign to" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Choose owner</option>
              {data.team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button
              className="primary"
              disabled={!selected.length || (method === "Manual" && !owner)}
              onClick={() =>
                void mutate((d) => {
                  selected.forEach((id, i) => {
                    const l = d.leads.find((l) => l.id === id)!;
                    const match =
                      method === "Service-Based"
                        ? d.team.find((t) => t.service === l.service)
                        : method === "Region-Based"
                          ? d.team.find((t) => t.region.startsWith(l.city))
                          : method === "Campaign-Based"
                            ? d.team[
                                d.campaigns.findIndex((c) => c.id === l.campaignId) % d.team.length
                              ]
                            : undefined;
                    assignLead(
                      d,
                      id,
                      method === "Manual" ? owner : (match?.id ?? d.team[i % d.team.length]!.id),
                      `${method} (local simulation)`,
                    );
                  });
                }).then((ok) => {
                  if (ok) setSelected([]);
                })
              }
            >
              Assign {selected.length} selected
            </Button>
            <span className="crm-muted">Simulated rules · no background automation</span>
          </div>
          <Table
            rows={data.leads.filter(
              (l) => l.status !== "Archived" && (tab === "Unassigned" ? !l.ownerId : !!l.ownerId),
            )}
            selected={selected}
            onSelect={setSelected}
            onOpen={(l) => ui.lead(l.id)}
            label="assignment leads"
            columns={[
              { key: "name", label: "Lead" },
              { key: "service", label: "Service" },
              { key: "city", label: "Region" },
              { key: "source", label: "Source" },
              {
                key: "ownerId",
                label: "Current owner",
                value: (l) => data.team.find((t) => t.id === l.ownerId)?.name ?? "Unassigned",
              },
              { key: "priority", label: "Priority", render: (l) => <Badge>{l.priority}</Badge> },
            ]}
          />
        </>
      )}
    </>
  );
}
export function Duplicates() {
  const { data, mutate } = useCrm();
  const groups = duplicates(data);
  const [compare, setCompare] = useState("");
  const group = groups.find((g) => g.key === compare);
  return (
    <>
      <div className="crm-mini-kpis">
        <Panel>
          <small>Potential duplicate pairs</small>
          <strong>{groups.length}</strong>
        </Panel>
        <Panel>
          <small>Reviewed pairs</small>
          <strong>{data.settings.reviewedDuplicates.length}</strong>
        </Panel>
        <Panel>
          <small>Matching signals</small>
          <p>Normalized email, mobile, or name + company + city</p>
        </Panel>
      </div>
      <Table
        rows={groups.map((g) => ({ ...g, id: g.key }))}
        label="duplicate groups"
        columns={[
          { key: "primary", label: "Primary record", value: (g) => g.primary.name },
          { key: "secondary", label: "Potential duplicate", value: (g) => g.secondary.name },
          { key: "reason", label: "Match reason" },
          {
            key: "confidence",
            label: "Confidence",
            value: (g) => (g.reason.startsWith("Name") ? "Review required" : "High"),
          },
          {
            key: "created",
            label: "Created dates",
            value: (g) => `${dateLabel(g.primary.createdAt)} / ${dateLabel(g.secondary.createdAt)}`,
          },
        ]}
        actions={(g) => (
          <div className="crm-actions">
            <Button onClick={() => setCompare(g.key)}>Compare & merge preview</Button>
            <Button
              onClick={() =>
                void mutate((d) => {
                  d.settings.reviewedDuplicates.push(g.key);
                  audit(d, "Duplicate Kept Separate", "leads", g.primary.id, g.reason);
                })
              }
            >
              Keep separate
            </Button>
            <Button
              onClick={() =>
                void mutate((d) => {
                  d.settings.reviewedDuplicates.push(g.key);
                  audit(d, "Duplicate Reviewed", "leads", g.primary.id, g.reason);
                })
              }
            >
              Mark reviewed
            </Button>
          </div>
        )}
      />
      {group && (
        <Modal
          title="Compare & merge preview"
          description="The primary record retains its fields. Linked records and source attribution are preserved. Customers are never merged."
          onClose={() => setCompare("")}
          wide
        >
          <div className="crm-two-col">
            {[group.primary, group.secondary].map((l, i) => (
              <Panel key={l.id} title={i ? "Archive after merge" : "Keep as primary"}>
                <div className="crm-pad">
                  <h3>{l.name}</h3>
                  <p>{l.email}</p>
                  <p>{l.mobile}</p>
                  <p>
                    {l.company} · {l.city}
                  </p>
                  <p>
                    {l.source} · {dateLabel(l.createdAt)}
                  </p>
                  <p>{data.team.find((t) => t.id === l.ownerId)?.name ?? "Unassigned"}</p>
                  <small>{l.id}</small>
                </div>
              </Panel>
            ))}
          </div>
          <p>
            Opportunities, activities, quotations, enquiries, bookings, tasks, follow-ups,
            conversations and document references will move to the primary lead. The archived source
            record remains available in local data.
          </p>
          <Button
            className="primary"
            onClick={() => {
              if (window.confirm("Merge these two leads locally and archive the secondary record?"))
                void mutate(
                  (d) => mergeLeads(d, group.primary.id, group.secondary.id),
                  "Leads merged safely",
                ).then((ok) => {
                  if (ok) setCompare("");
                });
            }}
          >
            Confirm local merge
          </Button>
        </Modal>
      )}
    </>
  );
}
export function Campaigns() {
  const { data } = useCrm();
  const ui = useCrmUI();
  const [selected, setSelected] = useState("");
  const c = data.campaigns.find((c) => c.id === selected);
  const leads = (id: string) =>
    data.leads.filter((l) => l.campaignId === id && l.status !== "Archived");
  const bookings = (id: string) =>
    data.bookings.filter(
      (b) =>
        ["Confirmed", "Completed"].includes(b.status) && leads(id).some((l) => l.id === b.leadId),
    );
  const metric = (c: CrmCampaign) => ({
    leads: leads(c.id).length,
    qualified: leads(c.id).filter((l) => l.status === "Qualified").length,
    bookings: bookings(c.id).length,
    cpl: leads(c.id).length ? c.spend / leads(c.id).length : 0,
    revenue: bookings(c.id).reduce((n, b) => n + b.value, 0),
  });
  return (
    <>
      <div className="crm-section-actions">
        <p className="crm-muted">
          Simulated campaign spend and attribution from shared sample records.
        </p>
        <Button className="primary" onClick={() => ui.form({ kind: "campaigns" })}>
          <Plus size={15} />
          Create campaign
        </Button>
      </div>
      <Table
        rows={data.campaigns}
        onOpen={(c) => setSelected(c.id)}
        label="campaigns"
        columns={[
          { key: "name", label: "Campaign" },
          { key: "platform", label: "Platform" },
          { key: "id", label: "Campaign ID" },
          { key: "status", label: "Status", render: (c) => <Badge>{c.status}</Badge> },
          { key: "startDate", label: "Start", render: (c) => dateLabel(c.startDate) },
          { key: "endDate", label: "End", render: (c) => dateLabel(c.endDate) },
          { key: "spend", label: "Mock spend", render: (c) => money(c.spend) },
          { key: "leads", label: "Leads", value: (c) => metric(c).leads },
          { key: "qualified", label: "Qualified", value: (c) => metric(c).qualified },
          { key: "bookings", label: "Bookings", value: (c) => metric(c).bookings },
          { key: "cpl", label: "Cost per lead", render: (c) => money(metric(c).cpl) },
          {
            key: "conversion",
            label: "Conversion",
            value: (c) =>
              `${metric(c).leads ? ((metric(c).bookings / metric(c).leads) * 100).toFixed(1) : 0}%`,
          },
          { key: "revenue", label: "Attributed value", render: (c) => money(metric(c).revenue) },
        ]}
      />
      {c && (
        <Modal
          title={c.name}
          description="Campaign details · all metrics are mock data."
          onClose={() => setSelected("")}
          wide
        >
          <div className="crm-mini-kpis">
            {Object.entries(metric(c)).map(([k, v]) => (
              <Panel key={k}>
                <small>{k}</small>
                <strong>{["cpl", "revenue"].includes(k) ? compactMoney(v) : v}</strong>
              </Panel>
            ))}
          </div>
          <p>
            {c.platform} · {c.region} · {c.service}
          </p>
          <p>{c.description}</p>
          <Button onClick={() => ui.form({ kind: "campaigns", id: c.id })}>Edit campaign</Button>
          <Panel title="Conversion funnel">
            <div className="crm-pipeline-summary">
              {[
                ["Leads", metric(c).leads],
                ["Qualified", metric(c).qualified],
                ["Bookings", metric(c).bookings],
              ].map(([label, n]) => (
                <div key={label}>
                  <span>{label}</span>
                  <progress value={Number(n)} max={Math.max(1, metric(c).leads)} />
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <h3>Assigned sales team</h3>
          <p>
            {[
              ...new Set(
                leads(c.id)
                  .map((l) => data.team.find((t) => t.id === l.ownerId)?.name)
                  .filter(Boolean),
              ),
            ].join(", ") || "Unassigned"}
          </p>
          <Table
            rows={leads(c.id)}
            onOpen={(l) => ui.lead(l.id)}
            columns={[
              { key: "name", label: "Lead" },
              { key: "source", label: "Source" },
              { key: "status", label: "Status" },
            ]}
            label="campaign leads"
          />
        </Modal>
      )}
    </>
  );
}
export function Integrations() {
  const { data, mutate } = useCrm();
  const [selected, setSelected] = useState(""),
    [mapping, setMapping] = useState("full_name → name; phone_number → mobile; email → email");
  const i = data.integrations.find((i) => i.id === selected);
  return (
    <>
      <div className="crm-notice">
        <Plug size={20} />
        <div>
          <strong>Your connected workspace, ready for the next phase.</strong>
          <p>
            Configuration previews only. Backend authentication, provider approval and credential
            storage will be implemented later. Do not enter API tokens.
          </p>
        </div>
      </div>
      <div className="crm-integration-grid">
        {data.integrations.map((i) => (
          <Panel key={i.id}>
            <span className="crm-integration-icon">
              <Plug size={22} />
            </span>
            <h2>{i.name}</h2>
            <Badge>{i.status}</Badge>
            <p>{i.description}</p>
            <small>Last sample sync: {dateLabel(i.lastSync)}</small>
            <Button
              onClick={() => {
                setSelected(i.id);
                setMapping(
                  i.configuration || "full_name → name; phone_number → mobile; email → email",
                );
              }}
            >
              Configure preview
            </Button>
          </Panel>
        ))}
      </div>
      {i && (
        <Modal
          title={i.name}
          description="Backend integration pending. This form accepts mapping preferences only, never credentials."
          onClose={() => setSelected("")}
        >
          <h3>Connection requirements</h3>
          <ul>
            <li>Server-side provider authorization and approved application</li>
            <li>Secure backend credential storage and webhook verification</li>
            <li>Consent-aware contact normalization and duplicate review</li>
          </ul>
          <h3>Supported features (planned)</h3>
          <p>{i.description}, import monitoring, mapping validation and retry handling.</p>
          <Field label="Field mapping preference (no tokens or credentials)">
            <textarea value={mapping} onChange={(e) => setMapping(e.target.value)} />
          </Field>
          <Button
            className="primary"
            onClick={() =>
              void mutate((d) => {
                if (/(?:token|secret|password|api[_ -]?key|bearer)\s*[:=]/i.test(mapping))
                  throw new Error("Do not enter credentials in local configuration.");
                const item = d.integrations.find((x) => x.id === i.id)!;
                item.configuration = mapping;
                item.status = "Configuration Required";
                audit(
                  d,
                  "Integration Preferences Saved",
                  "integrations",
                  i.id,
                  "Local mapping preferences only.",
                );
              }).then((ok) => {
                if (ok) setSelected("");
              })
            }
          >
            Save mapping preview
          </Button>
        </Modal>
      )}
    </>
  );
}
