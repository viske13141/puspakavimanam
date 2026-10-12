import { createFixtures } from "./fixtures";
import { type CrmData, type Collection, type RecordOf, type CrmLead, uid, isoNow } from "./model";
export const STORAGE_KEY = "viman.crm.v1";
export interface CrmRepository {
  load(): Promise<CrmData>;
  save(data: CrmData): Promise<void>;
}
export const mockRepository: CrmRepository = {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFixtures();
    const data = JSON.parse(raw) as CrmData;
    if (data.version !== 1 || !Array.isArray(data.leads) || !data.settings)
      throw new Error(
        "Stored CRM data could not be read. Export your browser data before resetting.",
      );
    return data;
  },
  async save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
};
export function audit(
  data: CrmData,
  action: string,
  entity: string,
  entityId: string,
  description: string,
  leadId = "",
) {
  const event = {
    id: uid(),
    createdAt: isoNow(),
    actor: "CRM workspace user",
    action,
    entity,
    entityId,
    description,
  };
  data.audit.unshift(event);
  if (leadId)
    data.activities.unshift({
      id: uid(),
      createdAt: event.createdAt,
      actor: event.actor,
      action,
      leadId,
      description,
    });
}
export function saveRecord<K extends Collection>(data: CrmData, key: K, record: RecordOf<K>) {
  if (
    key === "customers" &&
    "email" in record &&
    "mobile" in record &&
    data.customers.some(
      (c) =>
        c.id !== record.id &&
        ((record.email && normalizeEmail(c.email) === normalizeEmail(record.email)) ||
          (record.mobile && normalizePhone(c.mobile) === normalizePhone(record.mobile))),
    )
  )
    throw new Error(
      "A customer with this contact already exists. Open the existing customer profile.",
    );
  const rows = data[key] as RecordOf<K>[];
  const i = rows.findIndex((r) => r.id === record.id);
  if (i >= 0) rows[i] = record;
  else rows.unshift(record);
  audit(
    data,
    `${({ leads: "Lead", customers: "Customer", opportunities: "Opportunity", quotations: "Quotation", tasks: "Task", followups: "Follow-up", campaigns: "Campaign", templates: "Template" } as Partial<Record<Collection, string>>)[key] ?? key} ${i >= 0 ? "Edited" : "Created"}`,
    key,
    record.id,
    "Record saved locally.",
    "leadId" in record ? String(record.leadId) : key === "leads" ? record.id : "",
  );
  if (key === "followups") refreshNextFollowups(data);
  if (key === "campaigns" && "platform" in record) {
    for (const lead of data.leads.filter((l) => l.campaignId === record.id)) {
      lead.source = record.platform;
      lead.sourceHistory = [...new Set([...lead.sourceHistory, record.platform])];
    }
  }
}
export function refreshNextFollowups(data: CrmData) {
  for (const lead of data.leads)
    lead.nextFollowup =
      data.followups
        .filter((f) => f.leadId === lead.id && f.status !== "Completed")
        .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0]?.due ?? "";
}
export function assignLead(data: CrmData, leadId: string, ownerId: string, method = "Manual") {
  const lead = data.leads.find((l) => l.id === leadId);
  if (!lead) return;
  const previousOwnerId = lead.ownerId;
  lead.ownerId = ownerId;
  data.opportunities.filter((o) => o.leadId === leadId).forEach((o) => (o.ownerId = ownerId));
  data.assignments.unshift({
    id: uid(),
    createdAt: isoNow(),
    leadId,
    ownerId,
    previousOwnerId,
    method,
  });
  audit(
    data,
    "Lead Assigned",
    "leads",
    leadId,
    `${method} assignment to ${data.team.find((t) => t.id === ownerId)?.name ?? "Unassigned"}.`,
    leadId,
  );
}
export function convertLead(data: CrmData, leadId: string) {
  const lead = data.leads.find((l) => l.id === leadId);
  if (!lead) return;
  const existing = data.opportunities.find(
    (o) => o.leadId === leadId && !["Booked", "Lost"].includes(o.stage),
  );
  if (existing)
    throw new Error("This lead already has an active opportunity. Open Pipeline to review it.");
  const o = {
    id: uid(),
    createdAt: isoNow(),
    name: `${lead.name} · ${lead.service}`,
    leadId,
    ownerId: lead.ownerId,
    stage: data.settings.stages[0]!,
    value: lead.value,
    lossReason: "",
  };
  data.opportunities.unshift(o);
  audit(data, "Opportunity Created", "opportunities", o.id, o.name, leadId);
}
export function moveOpportunity(data: CrmData, id: string, stage: string, reason = "") {
  if (stage === "Lost" && !reason.trim()) throw new Error("A loss reason is required.");
  const o = data.opportunities.find((r) => r.id === id);
  if (!o) throw new Error("Opportunity not found.");
  o.stage = stage;
  o.lossReason = stage === "Lost" ? reason : "";
  audit(
    data,
    "Pipeline Stage Changed",
    "opportunities",
    id,
    `Moved to ${stage}${reason ? `: ${reason}` : ""}.`,
    o.leadId,
  );
}
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const normalizePhone = (s: string) => s.replace(/\D/g, "").slice(-10);
export function duplicates(data: CrmData) {
  const results: { primary: CrmLead; secondary: CrmLead; reason: string; key: string }[] = [];
  for (let i = 0; i < data.leads.length; i++) {
    const a = data.leads[i]!;
    if (a.status === "Archived") continue;
    for (let j = i + 1; j < data.leads.length; j++) {
      const b = data.leads[j]!;
      if (b.status === "Archived") continue;
      const email = a.email && normalizeEmail(a.email) === normalizeEmail(b.email);
      const phone = a.mobile && normalizePhone(a.mobile) === normalizePhone(b.mobile);
      const secondary =
        a.name.toLowerCase() === b.name.toLowerCase() &&
        a.company !== "Independent" &&
        a.company === b.company &&
        a.city === b.city;
      const key = [a.id, b.id].sort().join(":");
      if ((email || phone || secondary) && !data.settings.reviewedDuplicates.includes(key))
        results.push({
          primary: a,
          secondary: b,
          reason: email
            ? "Matching email"
            : phone
              ? "Matching mobile"
              : "Name, company and city match",
          key,
        });
    }
  }
  return results;
}
export function mergeLeads(data: CrmData, primaryId: string, secondaryId: string) {
  const a = data.leads.find((l) => l.id === primaryId),
    b = data.leads.find((l) => l.id === secondaryId);
  if (!a || !b) throw new Error("Both records are required.");
  if (a.customerId && b.customerId && a.customerId !== b.customerId)
    throw new Error(
      "These records link to different customers. Keep separate and review customer identity.",
    );
  a.customerId ||= b.customerId;
  a.email ||= b.email;
  a.mobile ||= b.mobile;
  a.notes = [a.notes, b.notes].filter(Boolean).join("\n");
  a.sourceHistory = [...new Set([...a.sourceHistory, ...b.sourceHistory])];
  for (const key of [
    "opportunities",
    "activities",
    "tasks",
    "followups",
    "quotations",
    "enquiries",
    "bookings",
    "conversations",
    "assignments",
    "documents",
    "notifications",
  ] as const) {
    for (const record of data[key]) if (record.leadId === secondaryId) record.leadId = primaryId;
  }
  b.status = "Archived";
  audit(
    data,
    "Lead Merged",
    "leads",
    a.id,
    `Merged ${b.id}; original source retained: ${b.source}.`,
    a.id,
  );
}
export function csv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      columns.map(cell).join(","),
      ...rows.map((r) => columns.map((k) => cell(r[k])).join(",")),
    ].join("\r\n")
  );
}
export function downloadCsv(name: string, rows: Record<string, unknown>[], columns: string[]) {
  const url = URL.createObjectURL(
    new Blob([csv(rows, columns)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `viman-${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Unclosed quoted field.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim()) ?? [];
  return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}
