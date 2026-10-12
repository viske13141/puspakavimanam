import { useState } from "react";
import { useCrm } from "./store";
import {
  type Collection,
  type CrmLead,
  type CrmQuotationItem,
  type RecordOf,
  services,
  uid,
  isoNow,
  money,
} from "./model";
import { audit, assignLead, saveRecord } from "./repository";
import { Button, Field, Modal } from "./ui";
export type FormKind =
  | "leads"
  | "customers"
  | "opportunities"
  | "tasks"
  | "followups"
  | "campaigns"
  | "quotations"
  | "templates";
export const formNames: Record<FormKind, string> = {
  leads: "lead",
  customers: "customer",
  opportunities: "opportunity",
  tasks: "task",
  followups: "follow-up",
  campaigns: "campaign",
  quotations: "quotation",
  templates: "template",
};
export interface FormRequest {
  kind: FormKind;
  id?: string;
  leadId?: string;
}
export function RecordForm({ request, onClose }: { request: FormRequest; onClose: () => void }) {
  const { data, mutate, busy } = useCrm();
  const existing = request.id ? data[request.kind].find((r) => r.id === request.id) : undefined;
  const lead = data.leads.find((l) => l.id === request.leadId);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {
      name: "",
      email: "",
      mobile: "",
      company: "",
      city: "",
      service: lead?.service ?? services[0],
      source: "Manual",
      campaignId: "",
      ownerId: lead?.ownerId ?? "",
      status:
        request.kind === "quotations"
          ? "Draft"
          : request.kind === "tasks" || request.kind === "followups"
            ? "Open"
            : request.kind === "campaigns"
              ? "Active"
              : "New",
      priority: "Medium",
      value: String(lead?.value ?? 0),
      budget: "0",
      spend: "0",
      passengers: "1",
      departure: "",
      destination: "",
      travelDate: "",
      tripType: "One way",
      notes: "",
      leadId: lead?.id ?? "",
      customerId: lead?.customerId ?? "",
      opportunityId: data.opportunities.find((o) => o.leadId === lead?.id)?.id ?? "",
      stage: data.settings.stages[0]!,
      lossReason: "",
      title: "",
      description: "",
      due: "",
      type:
        request.kind === "customers"
          ? "Individual"
          : request.kind === "campaigns"
            ? "Lead generation"
            : "Call",
      outcome: "",
      platform: "Meta Ads",
      startDate: "",
      endDate: "",
      region: "",
      tax: "18",
      discount: "0",
      currency: "INR",
      validUntil: "",
      terms: "Subject to availability and weather clearance.",
      channel: "Email",
      subject: "",
      body: "",
      scheduledAt: "",
    };
    if (existing)
      for (const [k, v] of Object.entries(existing))
        if (typeof v === "string" || typeof v === "number") defaults[k] = String(v);
    for (const k of ["travelDate", "startDate", "endDate", "validUntil"])
      if (defaults[k]) defaults[k] = defaults[k]!.slice(0, 10);
    for (const k of ["due", "scheduledAt"])
      if (defaults[k]) {
        const date = new Date(defaults[k]!);
        defaults[k] = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
    return defaults;
  });
  const [items, setItems] = useState<CrmQuotationItem[]>(
    request.kind === "quotations" && existing && "items" in existing
      ? existing.items
      : [{ description: "Charter service", quantity: 1, unitPrice: lead?.value ?? 0 }],
  );
  const [error, setError] = useState("");
  const change = (k: string, v: string) => setValues((old) => ({ ...old, [k]: v }));
  const input = (k: string, label: string, type = "text", required = false) => (
    <Field key={k} label={label}>
      <input
        name={k}
        type={type}
        value={values[k] ?? ""}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => change(k, e.target.value)}
      />
    </Field>
  );
  const select = (
    k: string,
    label: string,
    options: readonly string[] | { id: string; name: string }[],
    blank = false,
  ) => (
    <Field key={k} label={label}>
      <select value={values[k] ?? ""} onChange={(e) => change(k, e.target.value)}>
        {blank && <option value="">Select / unassigned</option>}
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ),
        )}
      </select>
    </Field>
  );
  const text = (k: string, label: string) => (
    <Field key={k} label={label}>
      <textarea value={values[k] ?? ""} onChange={(e) => change(k, e.target.value)} rows={3} />
    </Field>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const v = values;
    const n = (k: string) => Number(v[k] || 0);
    const base = { id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? isoNow() };
    let record: RecordOf<Collection>;
    const nameKey = ["tasks", "followups"].includes(request.kind) ? "title" : "name";
    if (request.kind !== "quotations" && !v[nameKey]?.trim()) {
      setError("Enter a non-empty name or title.");
      return;
    }
    if (request.kind === "templates" && !v["body"]?.trim()) {
      setError("Enter a message body.");
      return;
    }
    if (request.kind === "leads" && (!Number.isInteger(n("passengers")) || n("passengers") < 1)) {
      setError("Passenger or guest count must be a positive whole number.");
      return;
    }
    if (
      ["leads", "customers"].includes(request.kind) &&
      !v["email"]?.trim() &&
      !v["mobile"]?.trim()
    ) {
      setError("Enter an email address or mobile number.");
      return;
    }
    if (v["mobile"] && !/^\+?[\d ()-]{10,18}$/.test(v["mobile"])) {
      setError("Enter a valid mobile number, including country code if available.");
      return;
    }
    if (["tasks", "followups", "opportunities"].includes(request.kind) && !v["leadId"]) {
      setError("Choose a related lead.");
      return;
    }
    if (
      ["tasks", "followups"].includes(request.kind) &&
      !Number.isFinite(Date.parse(v["due"] ?? ""))
    ) {
      setError("Enter a valid due date and time.");
      return;
    }
    if (request.kind === "campaigns" && v["endDate"]! < v["startDate"]!) {
      setError("End date must be on or after start date.");
      return;
    }
    const common = {
      ...base,
      name: v["name"]!.trim(),
      email: v["email"]!.trim(),
      mobile: v["mobile"]!.trim(),
      company: v["company"]!,
      ownerId: v["ownerId"]!,
      status: v["status"]!,
    };
    switch (request.kind) {
      case "leads":
        record = {
          ...common,
          city: v["city"]!,
          service: v["service"]!,
          source: data.campaigns.find((c) => c.id === v["campaignId"])?.platform ?? v["source"]!,
          sourceHistory: [
            ...new Set([
              ...(existing && "sourceHistory" in existing ? existing.sourceHistory : []),
              data.campaigns.find((c) => c.id === v["campaignId"])?.platform ?? v["source"]!,
            ]),
          ],
          campaignId: v["campaignId"]!,
          customerId: v["customerId"]!,
          priority: v["priority"]!,
          value: n("value"),
          departure: v["departure"]!,
          destination: v["destination"]!,
          travelDate: v["travelDate"]!,
          passengers: n("passengers"),
          tripType: v["tripType"]!,
          notes: v["notes"]!,
          nextFollowup: existing && "nextFollowup" in existing ? existing.nextFollowup : "",
          responseMinutes: existing && "responseMinutes" in existing ? existing.responseMinutes : 0,
          externalId: existing && "externalId" in existing ? existing.externalId : "",
          importStatus: existing && "importStatus" in existing ? existing.importStatus : "Manual",
          consent: existing && "consent" in existing ? existing.consent : "",
        };
        break;
      case "customers":
        record = { ...common, type: v["type"]!, status: "Active" };
        break;
      case "opportunities":
        record = {
          ...base,
          name: v["name"]!,
          leadId: v["leadId"]!,
          ownerId: v["ownerId"]!,
          stage: v["stage"]!,
          value: n("value"),
          lossReason: v["lossReason"]!,
        };
        if (v["stage"] === "Lost" && !v["lossReason"]?.trim()) {
          setError("Enter a loss reason.");
          return;
        }
        break;
      case "tasks":
      case "followups":
        record = {
          ...base,
          title: v["title"]!,
          description: v["description"]!,
          leadId: v["leadId"]!,
          ownerId: v["ownerId"]!,
          priority: v["priority"]!,
          due: new Date(v["due"]!).toISOString(),
          status: v["status"]!,
          type: v["type"]!,
          outcome: v["outcome"]!,
        };
        break;
      case "campaigns":
        record = {
          ...base,
          name: v["name"]!,
          platform: v["platform"]!,
          status: v["status"]!,
          startDate: v["startDate"]!,
          endDate: v["endDate"]!,
          budget: n("budget"),
          spend: existing && "spend" in existing ? existing.spend : 0,
          service: v["service"]!,
          region: v["region"]!,
          description: v["description"]!,
          type: v["type"]!,
        };
        break;
      case "quotations": {
        const o = data.opportunities.find((o) => o.id === v["opportunityId"]);
        if (!o) {
          setError("Choose a linked opportunity.");
          return;
        }
        const l = data.leads.find((l) => l.id === o.leadId)!;
        if (
          items.length === 0 ||
          items.some((i) => !i.description.trim() || i.quantity <= 0 || i.unitPrice < 0)
        ) {
          setError("Add valid line items with a positive quantity.");
          return;
        }
        record = {
          ...base,
          name: v["name"] || `VQ-LOCAL-${data.quotations.length + 1001}`,
          leadId: l.id,
          customerId: l.customerId,
          opportunityId: o.id,
          service: l.service,
          items,
          tax: n("tax"),
          discount: n("discount"),
          currency: v["currency"]!,
          validUntil: v["validUntil"]!,
          terms: v["terms"]!,
          notes: v["notes"]!,
          status: "Draft",
          ownerId: o.ownerId,
        };
        break;
      }
      case "templates":
        record = {
          ...base,
          name: v["name"]!,
          channel: v["channel"]!,
          subject: v["subject"]!,
          body: v["body"]!,
          status: v["status"] === "New" ? "Template" : v["status"]!,
          scheduledAt: v["scheduledAt"]!,
          leadId: v["leadId"]!,
        };
        break;
    }
    const ok = await mutate((d) => {
      if (
        request.kind === "leads" &&
        existing &&
        "ownerId" in existing &&
        existing.ownerId !== values["ownerId"]
      )
        assignLead(d, existing.id, values["ownerId"]!);
      saveRecord(d, request.kind, record as never);
      if (
        request.kind === "opportunities" &&
        existing &&
        "stage" in existing &&
        existing.stage !== values["stage"]
      )
        audit(
          d,
          "Pipeline Stage Changed",
          "opportunities",
          base.id,
          values["stage"]!,
          values["leadId"]!,
        );
      if (request.kind === "followups") {
        const l = d.leads.find((l) => l.id === values["leadId"]);
        if (l) {
          audit(d, "Follow-up Scheduled", "followups", base.id, values["title"]!, l.id);
        }
      }
    });
    if (ok) onClose();
  }
  return (
    <Modal
      title={`${existing ? "Edit" : "Create"} ${formNames[request.kind]}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="crm-form">
        <div className="crm-form-grid">
          {["leads", "customers"].includes(request.kind) && (
            <>
              {input("name", "Full name", "text", true)}
              {input("email", "Email", "email")}
              {input("mobile", "Mobile")}
              {input("company", "Company")}
              {select("ownerId", "Sales owner", data.team, true)}
            </>
          )}
          {request.kind === "leads" && (
            <>
              {select("service", "Service interest", services)}
              {input("city", "City")}
              {select("source", "Lead source", data.settings.sources)}
              {select("campaignId", "Campaign", data.campaigns, true)}
              {select("status", "Lead status", data.settings.statuses)}
              {select("priority", "Priority", data.settings.priorities)}
              {input("value", "Estimated budget (INR)", "number")}
              {input(
                "travelDate",
                values["service"] === "Aviation Event" ? "Event date" : "Travel date",
                "date",
              )}
              {input(
                "departure",
                values["service"] === "Aviation Event"
                  ? "Event location"
                  : "Departure airport / helipad",
              )}
              {values["service"] !== "Aviation Event" && input("destination", "Destination")}
              {input(
                "passengers",
                values["service"] === "Aviation Event" ? "Guest count" : "Passenger count",
                "number",
              )}
              {select("tripType", "Trip type", ["One way", "Round trip"])}
              {text(
                "notes",
                values["service"] === "Aviation Event"
                  ? "Event type & aviation requirements"
                  : "Notes",
              )}
            </>
          )}
          {request.kind === "customers" &&
            select("type", "Customer type", ["Individual", "Corporate", "VIP", "Repeat"])}
          {request.kind === "opportunities" && (
            <>
              {input("name", "Opportunity name", "text", true)}
              {select("leadId", "Related lead", data.leads, true)}
              {select("ownerId", "Owner", data.team, true)}
              {select("stage", "Stage", data.settings.stages)}
              {input("value", "Estimated value (INR)", "number")}
              {values["stage"] === "Lost" && input("lossReason", "Loss reason", "text", true)}
            </>
          )}
          {["tasks", "followups"].includes(request.kind) && (
            <>
              {input("title", "Title", "text", true)}
              {select("leadId", "Related lead", data.leads, true)}
              {select("ownerId", "Assigned to", data.team, true)}
              {select("priority", "Priority", data.settings.priorities)}
              {select("type", "Task type", [
                "Call",
                "Email",
                "Meeting",
                "Follow-up",
                "Documentation",
                "Quotation",
                "Other",
              ])}
              {input("due", "Due date & time (your local time)", "datetime-local", true)}
              {select("status", "Status", ["Open", "In Progress", "Completed"])}
              {text("description", "Description")}
              {request.kind === "followups" && text("outcome", "Outcome")}
            </>
          )}
          {request.kind === "campaigns" && (
            <>
              {input("name", "Campaign name", "text", true)}
              {select("platform", "Platform", data.settings.sources)}
              {select("status", "Campaign status", ["Active", "Paused", "Completed", "Draft"])}
              {input("type", "Campaign type")}
              {input("startDate", "Start date", "date", true)}
              {input("endDate", "End date", "date", true)}
              {input("budget", "Budget (INR)", "number")}
              {select("service", "Target service", services)}
              {input("region", "Target region")}
              {text("description", "Description")}
            </>
          )}
          {request.kind === "quotations" && (
            <>
              {input("name", "Quote number (generated if blank)")}
              {select("opportunityId", "Linked opportunity", data.opportunities, true)}
              {select("currency", "Currency", ["INR"])}
              {input("validUntil", "Valid until", "date", true)}
              {input("tax", "Tax / fees (%)", "number")}
              {input("discount", "Discount (INR)", "number")}
              {text("terms", "Terms")}
              {text("notes", "Notes")}
            </>
          )}
          {request.kind === "templates" && (
            <>
              {input("name", "Template / draft name", "text", true)}
              {select("channel", "Channel", ["Email", "SMS"])}
              {input("subject", "Subject")}
              {select("status", "Save as", ["Template", "Draft", "Scheduled (mock)"])}
              {select("leadId", "Recipient lead", data.leads, true)}
              {values["status"] === "Scheduled (mock)" &&
                input("scheduledAt", "Scheduled time (simulation only)", "datetime-local", true)}
              {text("body", "Message body")}
            </>
          )}
        </div>
        {request.kind === "quotations" && (
          <section>
            <h3>Line items</h3>
            {items.map((item, i) => (
              <div className="crm-line-item" key={i}>
                <input
                  aria-label="Line description"
                  value={item.description}
                  onChange={(e) =>
                    setItems(
                      items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                    )
                  }
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((x, j) =>
                        j === i ? { ...x, quantity: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Unit price"
                  type="number"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) =>
                    setItems(
                      items.map((x, j) =>
                        j === i ? { ...x, unitPrice: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <Button onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            ))}
            <Button
              onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])}
            >
              Add line item
            </Button>
            <h3 className="crm-total">
              Total{" "}
              {money(
                Math.max(
                  0,
                  items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) *
                    (1 + Number(values["tax"]) / 100) -
                    Number(values["discount"]),
                ),
              )}
            </h3>
          </section>
        )}
        {error && (
          <p role="alert" className="crm-error">
            {error}
          </p>
        )}
        <footer className="crm-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <button className="crm-btn primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save locally"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
