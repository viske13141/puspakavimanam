import { useState } from "react";
import { Plus, Calendar, List, Kanban, Check, ArrowUpRight } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import {
  type CrmTask,
  type CrmCustomer,
  type CrmQuotation,
  type CrmBookingLink,
  type CrmEnquiry,
  DEMO_NOW,
  dayKey,
  dateLabel,
  money,
  quoteTotal,
  uid,
  isoNow,
} from "./model";
import { audit, downloadCsv, saveRecord, refreshNextFollowups } from "./repository";
import { Table, Panel, Button, Badge, Modal, Empty, Select } from "./ui";
export function Tasks({ followups = false }: { followups?: boolean }) {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const key = followups ? "followups" : "tasks";
  const [tab, setTab] = useState("All"),
    [view, setView] = useState("List"),
    [month, setMonth] = useState("2026-10");
  const rows = data[key].filter((t) =>
    tab === "All" || tab === "Completed"
      ? tab === "All" || t.status === "Completed"
      : t.status !== "Completed" &&
        (tab === "Today"
          ? dayKey(t.due) === "2026-10-12"
          : tab === "Overdue"
            ? Date.parse(t.due) < Date.parse(DEMO_NOW)
            : Date.parse(t.due) > Date.parse(DEMO_NOW)),
  );
  const complete = (t: CrmTask) =>
    void mutate((d) => {
      d[key].find((x) => x.id === t.id)!.status = t.status === "Completed" ? "Open" : "Completed";
      if (followups) refreshNextFollowups(d);
      audit(
        d,
        t.status === "Completed" ? "Task Reopened" : "Task Completed",
        key,
        t.id,
        t.title,
        t.leadId,
      );
    });
  const actions = (t: CrmTask) => (
    <div className="crm-actions">
      <Button onClick={() => ui.form({ kind: key, id: t.id })}>
        {followups ? "Reschedule / outcome" : "Edit / reassign"}
      </Button>
      <Button onClick={() => complete(t)}>
        {t.status === "Completed" ? "Reopen" : "Complete"}
      </Button>
      {followups && (
        <Button onClick={() => ui.form({ kind: "followups", leadId: t.leadId })}>
          Next follow-up
        </Button>
      )}
      <Button
        onClick={() => {
          if (window.confirm(`Delete ${t.title}?`))
            void mutate((d) => {
              if (key === "followups") d.followups = d.followups.filter((x) => x.id !== t.id);
              else d.tasks = d.tasks.filter((x) => x.id !== t.id);
              if (followups) refreshNextFollowups(d);
              audit(d, "Task Deleted", key, t.id, t.title, t.leadId);
            });
        }}
      >
        Delete
      </Button>
    </div>
  );
  const card = (t: CrmTask) => (
    <article key={t.id} className="crm-task-card">
      <Badge>{t.priority}</Badge>
      <button className="crm-card-name" onClick={() => ui.lead(t.leadId)}>
        {t.title}
      </button>
      <p>{data.leads.find((l) => l.id === t.leadId)?.name}</p>
      <small
        className={
          t.status !== "Completed" && Date.parse(t.due) < Date.parse(DEMO_NOW) ? "crm-error" : ""
        }
      >
        {new Date(t.due).toLocaleString("en-IN")} · {t.type}
      </small>
      <p>{data.team.find((s) => s.id === t.ownerId)?.name ?? "Unassigned"}</p>
      {actions(t)}
    </article>
  );
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  return (
    <>
      <div className="crm-mini-kpis">
        {["Open", "In Progress", "Completed", "Overdue"].map((s) => (
          <Panel key={s}>
            <small>{s}</small>
            <strong>
              {
                data[key].filter((t) =>
                  s === "Overdue"
                    ? t.status !== "Completed" && Date.parse(t.due) < Date.parse(DEMO_NOW)
                    : t.status === s,
                ).length
              }
            </strong>
          </Panel>
        ))}
      </div>
      <div className="crm-section-actions">
        <div className="crm-tabs">
          {["All", "Today", "Upcoming", "Overdue", "Completed"].map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="crm-actions">
          {["List", "Board", "Calendar"].map((v) => (
            <Button key={v} className={view === v ? "selected" : ""} onClick={() => setView(v)}>
              {v === "List" ? (
                <List size={15} />
              ) : v === "Board" ? (
                <Kanban size={15} />
              ) : (
                <Calendar size={15} />
              )}{" "}
              {v}
            </Button>
          ))}
          <Button className="primary" onClick={() => ui.form({ kind: key })}>
            <Plus size={15} />
            {followups ? "Schedule follow-up" : "Add task"}
          </Button>
        </div>
      </div>
      {view === "List" && (
        <Table
          rows={rows}
          onOpen={(t) => ui.lead(t.leadId)}
          columns={[
            { key: "title", label: followups ? "Follow-up" : "Task" },
            {
              key: "leadId",
              label: "Contact",
              value: (t) => data.leads.find((l) => l.id === t.leadId)?.name ?? "",
            },
            { key: "type", label: "Type" },
            {
              key: "ownerId",
              label: "Owner",
              value: (t) => data.team.find((s) => s.id === t.ownerId)?.name ?? "Unassigned",
            },
            {
              key: "due",
              label: "Due date & time",
              render: (t) => (
                <span
                  className={
                    t.status !== "Completed" && Date.parse(t.due) < Date.parse(DEMO_NOW)
                      ? "crm-error"
                      : ""
                  }
                >
                  {new Date(t.due).toLocaleString("en-IN")}
                </span>
              ),
            },
            { key: "priority", label: "Priority", render: (t) => <Badge>{t.priority}</Badge> },
            { key: "status", label: "Status", render: (t) => <Badge>{t.status}</Badge> },
            { key: "description", label: "Notes" },
          ]}
          actions={actions}
          label={key}
        />
      )}
      {view === "Board" && (
        <div className="crm-three-col">
          {["Open", "In Progress", "Completed"].map((s) => (
            <Panel title={s} key={s}>
              {rows.filter((t) => t.status === s).map(card)}
            </Panel>
          ))}
        </div>
      )}
      {view === "Calendar" && (
        <Panel title="Activity calendar">
          <div className="crm-filterbar">
            <input
              aria-label="Calendar month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="crm-calendar">
            {Array.from({ length: days }, (_, i) => {
              const day = `${month}-${String(i + 1).padStart(2, "0")}`;
              return (
                <div key={day}>
                  <strong>{i + 1}</strong>
                  <small>
                    {new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}
                  </small>
                  {rows
                    .filter((t) => dayKey(t.due) === day)
                    .map((t) => (
                      <button key={t.id} onClick={() => ui.form({ kind: key, id: t.id })}>
                        <span>{t.type}</span>
                        {t.title}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </>
  );
}
export function Customers() {
  const { data } = useCrm();
  const ui = useCrmUI();
  const [customer, setCustomer] = useState<CrmCustomer | null>(null),
    [tab, setTab] = useState("Overview");
  const bs = (id: string) =>
    data.bookings.filter(
      (b) => b.customerId === id && ["Confirmed", "Completed"].includes(b.status),
    );
  return (
    <>
      <div className="crm-section-actions">
        <p>One customer. Every relationship, in view.</p>
        <Button className="primary" onClick={() => ui.form({ kind: "customers" })}>
          <Plus size={15} />
          Add customer
        </Button>
      </div>
      <Table
        rows={data.customers}
        onOpen={(c) => {
          setCustomer(c);
          setTab("Overview");
        }}
        label="customers"
        columns={[
          { key: "name", label: "Customer" },
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "company", label: "Company" },
          { key: "type", label: "Type" },
          {
            key: "enquiries",
            label: "Enquiries",
            value: (c) => data.enquiries.filter((e) => e.customerId === c.id).length,
          },
          { key: "bookings", label: "Bookings", value: (c) => bs(c.id).length },
          {
            key: "value",
            label: "Lifetime booking value",
            value: (c) => bs(c.id).reduce((n, b) => n + b.value, 0),
            render: (c) => money(bs(c.id).reduce((n, b) => n + b.value, 0)),
          },
          {
            key: "lastBooking",
            label: "Last booking",
            value: (c) =>
              bs(c.id)
                .map((b) => b.createdAt)
                .sort()
                .at(-1) ?? "—",
          },
          {
            key: "ownerId",
            label: "Owner",
            value: (c) => data.team.find((t) => t.id === c.ownerId)?.name ?? "Unassigned",
          },
          { key: "status", label: "Status", render: (c) => <Badge>{c.status}</Badge> },
        ]}
      />
      {customer && (
        <Modal
          title={customer.name}
          description="Customer 360° · Linked CRM records, no login account implied."
          onClose={() => setCustomer(null)}
          wide
        >
          <div className="crm-tabs">
            {[
              "Overview",
              "Contact Information",
              "Enquiries",
              "Opportunities",
              "Quotations",
              "Bookings",
              "Events",
              "Documents",
              "Communication History",
              "Activity Timeline",
            ].map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          {["Overview", "Contact Information"].includes(tab) ? (
            <>
              <div className="crm-detail-grid">
                {Object.entries(customer)
                  .filter(([k]) => !["id", "ownerId"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <small>{k}</small>
                      <p>{v}</p>
                    </div>
                  ))}
              </div>
              <Button onClick={() => ui.form({ kind: "customers", id: customer.id })}>
                Edit customer
              </Button>
              <h3>Linked leads</h3>
              {data.leads
                .filter((l) => l.customerId === customer.id && l.status !== "Archived")
                .map((l) => (
                  <button key={l.id} className="crm-widget-row" onClick={() => ui.lead(l.id)}>
                    {l.name}
                    <Badge>{l.status}</Badge>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            </>
          ) : (
            <CustomerLinks customerId={customer.id} tab={tab} />
          )}
        </Modal>
      )}
    </>
  );
}
function CustomerLinks({ customerId, tab }: { customerId: string; tab: string }) {
  const { data } = useCrm();
  const ui = useCrmUI();
  const ids = new Set(data.leads.filter((l) => l.customerId === customerId).map((l) => l.id));
  const rows =
    tab === "Enquiries"
      ? data.enquiries
          .filter((e) => e.customerId === customerId)
          .map((e) => ({ id: e.id, title: e.name, sub: e.status, leadId: e.leadId }))
      : tab === "Opportunities"
        ? data.opportunities
            .filter((o) => ids.has(o.leadId))
            .map((o) => ({ id: o.id, title: o.name, sub: o.stage, leadId: o.leadId }))
        : tab === "Quotations"
          ? data.quotations
              .filter((q) => q.customerId === customerId)
              .map((q) => ({ id: q.id, title: q.name, sub: q.status, leadId: q.leadId }))
          : tab === "Bookings"
            ? data.bookings
                .filter((b) => b.customerId === customerId)
                .map((b) => ({ id: b.id, title: b.name, sub: b.status, leadId: b.leadId }))
            : tab === "Events"
              ? data.enquiries
                  .filter((e) => e.customerId === customerId && e.service === "Aviation Event")
                  .map((e) => ({ id: e.id, title: e.name, sub: e.destination, leadId: e.leadId }))
              : tab === "Documents"
                ? data.documents
                    .filter((d) => ids.has(d.leadId))
                    .map((d) => ({ id: d.id, title: d.name, sub: d.status, leadId: d.leadId }))
                : tab === "Communication History"
                  ? data.conversations
                      .filter((c) => ids.has(c.leadId))
                      .map((c) => ({ id: c.id, title: c.channel, sub: c.status, leadId: c.leadId }))
                  : data.activities
                      .filter((a) => ids.has(a.leadId))
                      .map((a) => ({
                        id: a.id,
                        title: a.action,
                        sub: a.description,
                        leadId: a.leadId,
                      }));
  return (
    <>
      {rows.map((r) => (
        <button className="crm-widget-row" key={r.id} onClick={() => ui.lead(r.leadId)}>
          <strong>{r.title}</strong>
          <span>{r.sub}</span>
        </button>
      ))}
      {!rows.length && <Empty text="No linked records in this category" />}
    </>
  );
}
export function Quotations() {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [quoteId, setQuoteId] = useState(""),
    [status, setStatus] = useState("");
  const q = data.quotations.find((q) => q.id === quoteId);
  const update = (q: CrmQuotation, status: string) =>
    void mutate((d) => {
      d.quotations.find((x) => x.id === q.id)!.status = status;
      audit(
        d,
        "Quotation Status Changed",
        "quotations",
        q.id,
        `${q.name}: ${status} (local record only).`,
        q.leadId,
      );
    });
  return (
    <>
      <div className="crm-section-actions">
        <Select
          label="Quotation status"
          value={status}
          onChange={setStatus}
          options={[
            "Draft",
            "Pending Approval",
            "Sent",
            "Viewed",
            "Accepted",
            "Rejected",
            "Expired",
          ]}
          all="All quotations"
        />
        <Button className="primary" onClick={() => ui.form({ kind: "quotations" })}>
          <Plus size={15} />
          Create quotation
        </Button>
      </div>
      <Table
        rows={data.quotations.filter((q) => !status || q.status === status)}
        onOpen={(q) => setQuoteId(q.id)}
        label="quotations"
        columns={[
          { key: "name", label: "Quote number" },
          {
            key: "customerId",
            label: "Customer",
            value: (q) =>
              data.customers.find((c) => c.id === q.customerId)?.name ??
              data.leads.find((l) => l.id === q.leadId)?.name ??
              "—",
          },
          {
            key: "opportunityId",
            label: "Opportunity",
            value: (q) => data.opportunities.find((o) => o.id === q.opportunityId)?.name ?? "",
          },
          { key: "service", label: "Service" },
          {
            key: "amount",
            label: "Amount",
            value: (q) => quoteTotal(q),
            render: (q) => money(quoteTotal(q)),
          },
          { key: "currency", label: "Currency" },
          { key: "status", label: "Status", render: (q) => <Badge>{q.status}</Badge> },
          { key: "validUntil", label: "Valid until", render: (q) => dateLabel(q.validUntil) },
          {
            key: "ownerId",
            label: "Created by",
            value: (q) => data.team.find((t) => t.id === q.ownerId)?.name ?? "Workspace user",
          },
          { key: "createdAt", label: "Created", render: (q) => dateLabel(q.createdAt) },
        ]}
      />
      {q && (
        <Modal
          title={q.name}
          description="Quotation preview · local simulation, not sent externally."
          onClose={() => setQuoteId("")}
          wide
        >
          <div className="crm-quote-head">
            <span className="crm-eyebrow">VIMAN · PRIVATE AVIATION</span>
            <h2>{q.service}</h2>
            <p>
              {data.leads.find((l) => l.id === q.leadId)?.name} · Valid until{" "}
              {dateLabel(q.validUntil)}
            </p>
            <Badge>{q.status}</Badge>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((i, n) => (
                <tr key={n}>
                  <td>{i.description}</td>
                  <td>{i.quantity}</td>
                  <td>{money(i.unitPrice)}</td>
                  <td>{money(i.quantity * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="crm-total">
            <p>
              Taxes / fees: {q.tax}% · Discount: {money(q.discount)}
            </p>
            <h2>Total: {money(quoteTotal(q))}</h2>
          </div>
          <p>{q.terms}</p>
          <p>{q.notes}</p>
          <div className="crm-actions">
            {q.status === "Draft" && (
              <Button onClick={() => ui.form({ kind: "quotations", id: q.id })}>Edit draft</Button>
            )}
            <Button
              onClick={() =>
                void mutate((d) => {
                  const copy = {
                    ...q,
                    id: uid(),
                    createdAt: isoNow(),
                    name: `${q.name}-COPY-${d.quotations.length}`,
                    status: "Draft",
                  };
                  saveRecord(d, "quotations", copy);
                })
              }
            >
              Duplicate
            </Button>
            <Button onClick={() => update(q, "Sent")}>Mark sent locally</Button>
            <Select
              label="Record customer response"
              value={q.status}
              onChange={(s) => update(q, s)}
              options={[
                "Draft",
                "Pending Approval",
                "Sent",
                "Viewed",
                "Accepted",
                "Rejected",
                "Expired",
              ]}
            />
            <Button
              onClick={() =>
                downloadCsv(
                  q.name,
                  q.items.map((i) => ({ ...i, total: i.quantity * i.unitPrice })),
                  ["description", "quantity", "unitPrice", "total"],
                )
              }
            >
              Export preview CSV
            </Button>
            <Button onClick={() => window.print()}>Print preview</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function EnquiriesBookings({ bookings = false }: { bookings?: boolean }) {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [tab, setTab] = useState("All"),
    [detail, setDetail] = useState("");
  const collection = bookings ? data.bookings : data.enquiries;
  const rows = collection.filter((r) => tab === "All" || r.status === tab);
  const r = collection.find((r) => r.id === detail);
  return (
    <>
      {bookings && (
        <div className="crm-tabs">
          {["All", "Pending Confirmation", "Confirmed", "Completed", "Cancelled"].map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <Table<CrmBookingLink | CrmEnquiry>
        rows={rows}
        onOpen={(r) => setDetail(r.id)}
        label={bookings ? "bookings" : "enquiries"}
        columns={[
          { key: "name", label: bookings ? "Booking reference" : "Request number" },
          {
            key: "customerId",
            label: "Customer",
            value: (r) =>
              data.customers.find((c) => c.id === r.customerId)?.name ??
              data.leads.find((l) => l.id === r.leadId)?.name ??
              "—",
          },
          { key: "service", label: "Service" },
          {
            key: "route",
            label: "Route / event",
            value: (r) => ("route" in r ? r.route : `${r.departure} → ${r.destination}`),
          },
          {
            key: "travelDate",
            label: "Travel / event date",
            render: (r) => dateLabel(r.travelDate),
          },
          { key: "passengers", label: "Passengers / guests" },
          {
            key: "value",
            label: bookings ? "Booking value" : "Budget",
            value: (r) => ("value" in r ? r.value : r.budget),
            render: (r) => money("value" in r ? r.value : r.budget),
          },
          { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
          {
            key: "ownerId",
            label: "Sales owner",
            value: (r) => data.team.find((t) => t.id === r.ownerId)?.name ?? "Unassigned",
          },
          ...(bookings
            ? [{ key: "handover", label: "Operations handover" }]
            : [{ key: "createdAt", label: "Created" }]),
        ]}
      />
      {r && (
        <Modal
          title={r.name}
          description="Linked mock record · no real PNR, ticket or operations handover is generated."
          onClose={() => setDetail("")}
          wide
        >
          <div className="crm-detail-grid">
            {Object.entries(r).map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <p>{String(v) || "—"}</p>
              </div>
            ))}
          </div>
          <div className="crm-actions">
            <Button onClick={() => ui.lead(r.leadId)}>Open lead & timeline</Button>
            {"handover" in r && (
              <Select
                label="Local handover status"
                value={r.handover}
                onChange={(v) =>
                  void mutate((d) => {
                    d.bookings.find((b) => b.id === r.id)!.handover = v;
                    audit(
                      d,
                      "Booking Handover Updated",
                      "bookings",
                      r.id,
                      `${v} (mock only)`,
                      r.leadId,
                    );
                  })
                }
                options={["Pending", "Ready", "Handed over"]}
              />
            )}
          </div>
          <Panel title="Documents summary">
            {data.documents
              .filter((d) => d.leadId === r.leadId)
              .map((d) => (
                <p key={d.id} className="crm-pad">
                  {d.name} · {d.status}
                </p>
              ))}
            {!data.documents.some((d) => d.leadId === r.leadId) && (
              <p className="crm-pad">No document references attached.</p>
            )}
          </Panel>
          <Panel title="Timeline">
            {data.activities
              .filter((a) => a.leadId === r.leadId)
              .map((a) => (
                <div className="crm-widget-row" key={a.id}>
                  {a.action}
                  <small>{dateLabel(a.createdAt)}</small>
                </div>
              ))}
          </Panel>
        </Modal>
      )}
    </>
  );
}
