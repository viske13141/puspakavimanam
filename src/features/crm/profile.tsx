import { useState } from "react";
import { Phone, Mail, MessageCircle, Plus, CalendarClock, FileText } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Badge, Button, Modal, Panel, Empty } from "./ui";
import { audit } from "./repository";
import { money, dateLabel, quoteTotal } from "./model";
export function LeadDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const lead = data.leads.find((l) => l.id === id);
  const [tab, setTab] = useState("Overview"),
    [note, setNote] = useState("");
  if (!lead) return null;
  const owner = data.team.find((t) => t.id === lead.ownerId);
  const campaign = data.campaigns.find((c) => c.id === lead.campaignId);
  const tabs = [
    "Overview",
    "Activities",
    "Communications",
    "Opportunities",
    "Quotations",
    "Bookings",
    "Documents",
    "History",
  ];
  return (
    <Modal
      title={lead.name}
      description={`${lead.service} enquiry · ${lead.company} · ${lead.id}`}
      onClose={onClose}
      wide
    >
      <div className="crm-profile-summary">
        <span className="crm-avatar large">
          {lead.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <h2>{lead.name}</h2>
          <p>{lead.email || lead.mobile}</p>
        </div>
        <Badge>{lead.status}</Badge>
        <Badge>{lead.priority}</Badge>
        <Button onClick={() => ui.form({ kind: "leads", id })}>Edit lead</Button>
      </div>
      <div className="crm-actions">
        {lead.mobile && (
          <a className="crm-btn" href={`tel:${lead.mobile}`}>
            <Phone size={15} />
            Call
          </a>
        )}
        {lead.email && (
          <a className="crm-btn" href={`mailto:${lead.email}`}>
            <Mail size={15} />
            Email
          </a>
        )}
        {lead.mobile && (
          <a
            className="crm-btn"
            href={`https://wa.me/${lead.mobile.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} />
            Open WhatsApp
          </a>
        )}
        <Button onClick={() => ui.form({ kind: "tasks", leadId: id })}>
          <Plus size={15} />
          Task
        </Button>
        <Button onClick={() => ui.form({ kind: "followups", leadId: id })}>
          <CalendarClock size={15} />
          Follow-up / meeting
        </Button>
        <Button onClick={() => ui.form({ kind: "quotations", leadId: id })}>
          <FileText size={15} />
          Quotation
        </Button>
      </div>
      <div className="crm-tabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="crm-detail-grid">
            {Object.entries({
              Email: lead.email,
              Mobile: lead.mobile,
              Company: lead.company,
              Location: lead.city,
              Source: lead.source,
              "Source history": lead.sourceHistory.join(", "),
              Campaign: campaign?.name,
              "Assigned owner": owner?.name ?? "Unassigned",
              "Estimated value": money(lead.value),
              "Next follow-up": dateLabel(lead.nextFollowup),
              Created: dateLabel(lead.createdAt),
              "Customer account": lead.customerId
                ? "Linked CRM customer (no login implied)"
                : "No customer account required",
            })
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <small>{k}</small>
                  <p>{v}</p>
                </div>
              ))}
          </div>
          <Panel title="Service requirements">
            <div className="crm-detail-grid">
              {Object.entries(
                lead.service === "Aviation Event"
                  ? {
                      "Event date": dateLabel(lead.travelDate),
                      "Event location": lead.departure,
                      "Guest count": lead.passengers,
                      "Aviation requirement": lead.notes,
                      Budget: money(lead.value),
                    }
                  : {
                      Departure: lead.departure,
                      Destination: lead.destination,
                      "Travel date": dateLabel(lead.travelDate),
                      Passengers: lead.passengers,
                      "Trip type": lead.tripType,
                      Budget: money(lead.value),
                    },
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <small>{k}</small>
                    <p>{v}</p>
                  </div>
                ))}
            </div>
          </Panel>
          <Panel title="Lead source details">
            <div className="crm-detail-grid">
              {Object.entries({
                "External lead ID": lead.externalId,
                Platform: lead.source,
                "Campaign ID": lead.campaignId,
                "Ad / form": lead.externalId
                  ? `Sample ad ${lead.externalId} / Charter enquiry form`
                  : "Manual input",
                Submitted: dateLabel(lead.createdAt),
                "Import status": lead.importStatus,
                Consent: lead.consent,
                "Original mapping": "full_name → name; phone_number → mobile; email → email",
              })
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <small>{k}</small>
                    <p>{v}</p>
                  </div>
                ))}
            </div>
          </Panel>
          <p>{lead.notes}</p>
        </>
      )}
      {["Activities", "History"].includes(tab) && (
        <>
          <div className="crm-timeline">
            {data.activities
              .filter((a) => a.leadId === id)
              .map((a) => (
                <div key={a.id}>
                  <span className="crm-timeline-dot" />
                  <strong>{a.action}</strong>
                  <p>{a.description}</p>
                  <small>
                    {a.actor} · {new Date(a.createdAt).toLocaleString("en-IN")}
                  </small>
                </div>
              ))}
          </div>
          <label className="crm-field">
            Add an internal note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button
            disabled={!note.trim()}
            onClick={() =>
              void mutate((d) => audit(d, "Note Added", "leads", id, note, id)).then((ok) => {
                if (ok) setNote("");
              })
            }
          >
            Save note
          </Button>
        </>
      )}
      {tab === "Communications" && (
        <>
          {data.conversations
            .filter((c) => c.leadId === id)
            .map((c) => (
              <Panel key={c.id} title={`${c.channel} · ${c.status}`}>
                {data.messages
                  .filter((m) => m.conversationId === c.id)
                  .map((m) => (
                    <div className="crm-message" key={m.id}>
                      <small>
                        {m.direction} · {dateLabel(m.createdAt)}
                      </small>
                      <p>{m.text}</p>
                    </div>
                  ))}
              </Panel>
            ))}
          {!data.conversations.some((c) => c.leadId === id) && (
            <Empty text="No conversations yet" />
          )}
        </>
      )}
      {tab === "Opportunities" && (
        <>
          {data.opportunities
            .filter((o) => o.leadId === id)
            .map((o) => (
              <div className="crm-detail-row" key={o.id}>
                <strong>{o.name}</strong>
                <Badge>{o.stage}</Badge>
                <span>{money(o.value)}</span>
              </div>
            ))}
          {!data.opportunities.some((o) => o.leadId === id) && (
            <Empty text="No linked opportunities" />
          )}
        </>
      )}
      {tab === "Quotations" && (
        <>
          {data.quotations
            .filter((q) => q.leadId === id)
            .map((q) => (
              <div className="crm-detail-row" key={q.id}>
                {q.name}
                <Badge>{q.status}</Badge>
                {money(quoteTotal(q))}
              </div>
            ))}
          {!data.quotations.some((q) => q.leadId === id) && <Empty text="No quotations yet" />}
        </>
      )}
      {tab === "Bookings" && (
        <>
          {data.bookings
            .filter((b) => b.leadId === id)
            .map((b) => (
              <div className="crm-detail-row" key={b.id}>
                {b.name}
                <Badge>{b.status}</Badge>
                {b.route}
              </div>
            ))}
          {!data.bookings.some((b) => b.leadId === id) && <Empty text="No booking links" />}
        </>
      )}
      {tab === "Documents" && (
        <>
          {data.documents
            .filter((d) => d.leadId === id)
            .map((d) => (
              <div className="crm-detail-row" key={d.id}>
                <FileText size={18} />
                {d.name}
                <small>{d.status}</small>
              </div>
            ))}
          {!data.documents.some((d) => d.leadId === id) && <Empty text="No document references" />}
        </>
      )}
    </Modal>
  );
}
