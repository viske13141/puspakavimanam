import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Upload, Download, Users, RefreshCw } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Table, Button, Badge, Modal, Field, Select, Panel, type Column } from "./ui";
import { type CrmLead, services, money, dateLabel, dayKey, uid, isoNow, DEMO_NOW } from "./model";
import {
  assignLead,
  audit,
  convertLead,
  downloadCsv,
  parseCsv,
  normalizeEmail,
  normalizePhone,
} from "./repository";
export function Leads({ channel = "all" }: { channel?: string }) {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<string[]>([]),
    [assign, setAssign] = useState<string[] | null>(null),
    [owner, setOwner] = useState(""),
    [importing, setImporting] = useState(false),
    [importText, setImportText] = useState(""),
    [importError, setImportError] = useState(""),
    [tab, setTab] = useState("All Social Leads"),
    [savedName, setSavedName] = useState(""),
    [bulkStatus, setBulkStatus] = useState(""),
    [actionLead, setActionLead] = useState<CrmLead | null>(null);
  const filter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const base = data.leads.filter((l) =>
    channel === "social"
      ? ["Meta Ads", "Facebook", "Instagram", "Google Ads"].includes(l.source)
      : channel === "whatsapp"
        ? l.source === "WhatsApp"
        : channel === "website"
          ? l.source === "Website"
          : true,
  );
  const rows = base.filter(
    (l) =>
      (l.status !== "Archived" || filters["status"] === "Archived") &&
      Object.entries(filters).every(
        ([k, v]) =>
          !v ||
          (k === "from"
            ? l.createdAt.slice(0, 10) >= v
            : k === "to"
              ? l.createdAt.slice(0, 10) <= v
              : k === "due"
                ? v === "Overdue"
                  ? !!l.nextFollowup && Date.parse(l.nextFollowup) < Date.parse(DEMO_NOW)
                  : dayKey(l.nextFollowup) === "2026-10-12"
                : String(l[k as keyof CrmLead]) === v),
      ) &&
      (channel !== "social" ||
        tab === "All Social Leads" ||
        (tab === "Unassigned" && !l.ownerId) ||
        (tab === "Imported" && l.importStatus === "Imported") ||
        (tab === "Failed Imports" && l.importStatus === "Failed") ||
        l.source === tab),
  );
  const columns: Column<CrmLead>[] = [
    {
      key: "name",
      label: "Lead name",
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
    { key: "id", label: "Lead ID", render: (l) => <small>{l.id.slice(-6)}</small> },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "service", label: "Service interest" },
    { key: "source", label: "Source" },
    {
      key: "campaignId",
      label: "Campaign",
      value: (l) => data.campaigns.find((c) => c.id === l.campaignId)?.name ?? "—",
    },
    { key: "status", label: "Status", render: (l) => <Badge>{l.status}</Badge> },
    { key: "priority", label: "Priority", render: (l) => <Badge>{l.priority}</Badge> },
    {
      key: "ownerId",
      label: "Sales owner",
      value: (l) => data.team.find((t) => t.id === l.ownerId)?.name ?? "Unassigned",
    },
    { key: "value", label: "Est. value", value: (l) => l.value, render: (l) => money(l.value) },
    { key: "nextFollowup", label: "Next follow-up", render: (l) => dateLabel(l.nextFollowup) },
    { key: "createdAt", label: "Created", render: (l) => dateLabel(l.createdAt) },
  ];
  if (channel === "social")
    columns.splice(
      8,
      0,
      { key: "externalId", label: "External lead ID" },
      {
        key: "importStatus",
        label: "Import status",
        render: (l) => <Badge>{l.importStatus}</Badge>,
      },
      { key: "form", label: "Form / ad set", value: (l) => `Charter enquiry / ${l.service}` },
    );
  if (channel === "website")
    columns.splice(
      6,
      0,
      {
        key: "page",
        label: "Website page",
        value: (l) => (l.service === "Aviation Event" ? "/customer/events" : "/aviation"),
      },
      {
        key: "request",
        label: "Request",
        value: (l) => data.enquiries.find((e) => e.leadId === l.id)?.name ?? "Contact form",
      },
    );
  if (channel === "whatsapp")
    columns.splice(
      4,
      0,
      {
        key: "preview",
        label: "Conversation preview",
        value: (l) => {
          const c = data.conversations.find((c) => c.leadId === l.id);
          return (
            data.messages.find((m) => m.conversationId === c?.id)?.text ?? "No conversation yet"
          );
        },
      },
      {
        key: "unread",
        label: "Unread",
        value: (l) => data.conversations.find((c) => c.leadId === l.id)?.unread ?? 0,
      },
    );
  async function importLeads() {
    try {
      const parsed = parseCsv(importText);
      if (!parsed.length)
        throw new Error("Add CSV records with name, email or mobile, and service headers.");
      if (parsed.length > 1000) throw new Error("Import up to 1,000 records at a time.");
      for (const [i, row] of parsed.entries()) {
        if (
          !row["name"]?.trim() ||
          (!row["email"] && !row["mobile"]) ||
          !services.includes(row["service"] as (typeof services)[number])
        )
          throw new Error(
            `Row ${i + 2}: name, contact method and a supported service are required.`,
          );
        if (row["email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["email"]))
          throw new Error(`Row ${i + 2}: invalid email.`);
      }
      const ok = await mutate((d) => {
        let skipped = 0;
        for (const r of parsed) {
          if (
            d.leads.some(
              (l) =>
                (r["email"] && normalizeEmail(l.email) === normalizeEmail(r["email"])) ||
                (r["mobile"] && normalizePhone(l.mobile) === normalizePhone(r["mobile"])),
            )
          ) {
            skipped++;
            continue;
          }
          const l: CrmLead = {
            id: uid(),
            createdAt: isoNow(),
            name: r["name"]!,
            email: r["email"] ?? "",
            mobile: r["mobile"] ?? "",
            company: r["company"] ?? "",
            city: r["city"] ?? "",
            service: r["service"]!,
            source: d.settings.sources.includes(r["source"] ?? "") ? r["source"]! : "Manual",
            sourceHistory: [r["source"] || "Manual"],
            campaignId: "",
            customerId: "",
            ownerId: "",
            status: "New",
            priority: "Medium",
            value: Math.max(0, Number(r["value"]) || 0),
            departure: "",
            destination: "",
            travelDate: "",
            passengers: 1,
            tripType: "One way",
            notes: "CSV import",
            nextFollowup: "",
            responseMinutes: 0,
            externalId: "",
            importStatus: "Imported",
            consent: "",
          };
          d.leads.unshift(l);
          audit(d, "Lead Created", "leads", l.id, "Imported from CSV.", l.id);
        }
        audit(
          d,
          "Import Completed",
          "leads",
          "import",
          `${parsed.length - skipped} imported; ${skipped} matching contacts skipped.`,
        );
      }, "Import complete. Matching contacts were skipped; see audit log.");
      if (ok) {
        setImporting(false);
        setImportText("");
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    }
  }
  return (
    <>
      <div className="crm-section-actions">
        <span>{rows.length} active records</span>
        <div className="crm-actions">
          <Button onClick={() => setImporting(true)}>
            <Upload size={15} />
            Import leads
          </Button>
          <Button
            onClick={() =>
              downloadCsv(
                "leads",
                rows
                  .filter((l) => !selected.length || selected.includes(l.id))
                  .map((l) => ({
                    name: l.name,
                    service: l.service,
                    source: l.source,
                    status: l.status,
                    value: l.value,
                  })),
                ["name", "service", "source", "status", "value"],
              )
            }
          >
            <Download size={15} />
            Export leads
          </Button>
          <Button disabled={!selected.length} onClick={() => setAssign(selected)}>
            <Users size={15} />
            Bulk assign
          </Button>
          <Button className="primary" onClick={() => ui.form({ kind: "leads" })}>
            <Plus size={16} />
            Add lead
          </Button>
        </div>
      </div>
      {channel === "social" && (
        <>
          <div className="crm-tabs">
            {[
              "All Social Leads",
              "Facebook",
              "Instagram",
              "Google Ads",
              "Unassigned",
              "Imported",
              "Failed Imports",
            ].map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="crm-mini-kpis">
            {["Imported", "Failed", "Pending"].map((s) => (
              <Panel key={s}>
                <small>{s} leads</small>
                <strong>{base.filter((l) => l.importStatus === s).length}</strong>
              </Panel>
            ))}
            <Panel>
              <small>Connection status</small>
              <Badge>Mock only</Badge>
              <small>Last sample sync · 12 Oct 2026</small>
            </Panel>
          </div>
          <Button
            onClick={() =>
              void mutate((d) => {
                d.leads
                  .filter((l) => l.importStatus === "Failed")
                  .forEach((l) => {
                    l.email = normalizeEmail(l.email);
                    l.mobile = l.mobile.replace(/[ ()-]/g, "");
                    const duplicate = d.leads.some(
                      (x) =>
                        x.id !== l.id &&
                        x.status !== "Archived" &&
                        ((l.email && normalizeEmail(x.email) === l.email) ||
                          (l.mobile && normalizePhone(x.mobile) === normalizePhone(l.mobile))),
                    );
                    l.importStatus = duplicate ? "Duplicate" : "Imported";
                    if (!duplicate) {
                      assignLead(
                        d,
                        l.id,
                        d.team[d.leads.indexOf(l) % d.team.length]!.id,
                        "Simulated social import",
                      );
                      d.followups.push({
                        id: uid(),
                        createdAt: isoNow(),
                        title: "Contact imported social lead",
                        description: "Local import workflow",
                        leadId: l.id,
                        ownerId: l.ownerId,
                        priority: "Medium",
                        due: "2026-10-13T10:00:00+05:30",
                        status: "Open",
                        type: "Call",
                        outcome: "",
                      });
                    }
                    audit(d, "Social Import Retried", "leads", l.id, l.importStatus, l.id);
                  });
              }, "Local import workflow completed")
            }
          >
            <RefreshCw size={15} />
            Retry failed imports locally
          </Button>
        </>
      )}
      <div className="crm-filterbar">
        {[
          ["source", "Source", data.settings.sources],
          ["status", "Status", data.settings.statuses],
          ["service", "Service", services],
          ["priority", "Priority", data.settings.priorities],
        ].map(([key, label, options]) => (
          <Select
            key={String(key)}
            label={String(label)}
            value={filters[String(key)] ?? ""}
            onChange={(v) => filter(String(key), v)}
            options={options as readonly string[]}
            all={`All ${String(label).toLowerCase()}s`}
          />
        ))}
        <select
          aria-label="Owner filter"
          value={filters["ownerId"] ?? ""}
          onChange={(e) => filter("ownerId", e.target.value)}
        >
          <option value="">All owners</option>
          {data.team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Campaign filter"
          value={filters["campaignId"] ?? ""}
          onChange={(e) => filter("campaignId", e.target.value)}
        >
          <option value="">All campaigns</option>
          {data.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Select
          label="Follow-up due"
          value={filters["due"] ?? ""}
          onChange={(v) => filter("due", v)}
          options={["Today", "Overdue"]}
          all="Any follow-up"
        />
        <input
          aria-label="Created from"
          type="date"
          value={filters["from"] ?? ""}
          onChange={(e) => filter("from", e.target.value)}
        />
        <input
          aria-label="Created to"
          type="date"
          value={filters["to"] ?? ""}
          onChange={(e) => filter("to", e.target.value)}
        />
        <Button onClick={() => setFilters({})}>Clear</Button>
      </div>
      <div className="crm-filterbar">
        <input
          aria-label="Saved view name"
          placeholder="Name this filter view"
          value={savedName}
          onChange={(e) => setSavedName(e.target.value)}
        />
        <Button
          disabled={!savedName.trim()}
          onClick={() =>
            void mutate((d) => {
              d.settings.savedViews[savedName] = JSON.stringify(filters);
            }, "View saved")
          }
        >
          Save view
        </Button>
        <select
          aria-label="Load saved view"
          value=""
          onChange={(e) => {
            if (e.target.value) setFilters(JSON.parse(data.settings.savedViews[e.target.value]!));
          }}
        >
          <option value="">Saved views</option>
          {Object.keys(data.settings.savedViews).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        {selected.length > 0 && (
          <>
            <strong>{selected.length} selected</strong>
            <Select
              label="Bulk status"
              value={bulkStatus}
              onChange={setBulkStatus}
              options={data.settings.statuses.filter((s) => s !== "Archived")}
              all="Change status"
            />
            <Button
              disabled={!bulkStatus}
              onClick={() =>
                void mutate((d) => {
                  d.leads
                    .filter((l) => selected.includes(l.id))
                    .forEach((l) => {
                      l.status = bulkStatus;
                      audit(d, "Lead Status Changed", "leads", l.id, bulkStatus, l.id);
                    });
                }).then((ok) => {
                  if (ok) setSelected([]);
                })
              }
            >
              Apply status
            </Button>
            <Button onClick={() => setSelected([])}>Clear selection</Button>
          </>
        )}
      </div>
      <Table
        rows={rows}
        columns={columns}
        selected={selected}
        onSelect={setSelected}
        onOpen={(l) => ui.lead(l.id)}
        label="leads"
        actions={(l) => <Button onClick={() => setActionLead(l)}>Actions</Button>}
      />
      {actionLead && (
        <Modal title={`Actions · ${actionLead.name}`} onClose={() => setActionLead(null)}>
          <div className="crm-action-grid">
            {[
              "View",
              "Edit",
              "Assign",
              "Change status",
              "Add note",
              "Add task",
              "Schedule follow-up",
              "Convert to opportunity",
              "Open campaign",
              "Archive",
            ].map((action) => (
              <Button
                key={action}
                onClick={() => {
                  const l = actionLead;
                  setActionLead(null);
                  if (action === "View" || action === "Add note") ui.lead(l.id);
                  else if (action === "Edit" || action === "Change status")
                    ui.form({ kind: "leads", id: l.id });
                  else if (action === "Assign") setAssign([l.id]);
                  else if (action === "Add task") ui.form({ kind: "tasks", leadId: l.id });
                  else if (action === "Schedule follow-up")
                    ui.form({ kind: "followups", leadId: l.id });
                  else if (action === "Convert to opportunity")
                    void mutate((d) => convertLead(d, l.id), "Opportunity created locally");
                  else if (action === "Open campaign") window.location.assign("/crm/campaigns");
                  else if (
                    action === "Archive" &&
                    window.confirm(`Archive ${l.name}? Linked records will be retained.`)
                  )
                    void mutate((d) => {
                      d.leads.find((r) => r.id === l.id)!.status = "Archived";
                      audit(d, "Lead Archived", "leads", l.id, l.name, l.id);
                    });
                }}
              >
                {action}
              </Button>
            ))}
            {channel === "whatsapp" && (
              <a
                className="crm-btn"
                href={`https://wa.me/${actionLead.mobile.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                Open WhatsApp
              </a>
            )}
            {channel === "website" && (
              <Link to="/crm/enquiries" className="crm-btn">
                Open linked enquiries
              </Link>
            )}
          </div>
        </Modal>
      )}
      {assign && (
        <Modal title={`Assign ${assign.length} lead(s)`} onClose={() => setAssign(null)}>
          <Field label="Sales owner">
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Unassigned</option>
              {data.team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="primary"
            onClick={() =>
              void mutate((d) => assign.forEach((id) => assignLead(d, id, owner))).then((ok) => {
                if (ok) {
                  setAssign(null);
                  setSelected([]);
                }
              })
            }
          >
            Save assignment
          </Button>
        </Modal>
      )}
      {importing && (
        <Modal title="Import leads from CSV" onClose={() => setImporting(false)} wide>
          <p>
            Required headers: name, email or mobile, service. Services: {services.join(", ")}.
            Matching contacts are skipped for review.
          </p>
          <input
            aria-label="CSV file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void f
                  .text()
                  .then(setImportText)
                  .catch(() => setImportError("Unable to read file."));
            }}
          />
          <textarea
            aria-label="CSV contents"
            rows={8}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"name,email,mobile,service\nAarav Mehta,aarav@example.com,,Private Jet"}
          />
          {importError && (
            <p className="crm-error" role="alert">
              {importError}
            </p>
          )}
          <Button onClick={() => void importLeads()} className="primary">
            Validate & import locally
          </Button>
        </Modal>
      )}
    </>
  );
}
