import { useState } from "react";
import { Paperclip, Send, Search, MessageSquare, Plus } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { Panel, Table, Button, Badge, Select, Field, Empty } from "./ui";
import { audit } from "./repository";
import { dateLabel, uid, isoNow } from "./model";
export function Communications({ history = false }: { history?: boolean }) {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [selected, setSelected] = useState(data.conversations[0]?.id ?? ""),
    [channel, setChannel] = useState(""),
    [search, setSearch] = useState(""),
    [unread, setUnread] = useState(false),
    [text, setText] = useState(""),
    [attachment, setAttachment] = useState(""),
    [internal, setInternal] = useState(false);
  const rows = data.conversations.filter(
    (c) =>
      (!channel || c.channel === channel) &&
      (!unread || c.unread > 0) &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const c = data.conversations.find((c) => c.id === selected);
  const l = data.leads.find((l) => l.id === c?.leadId);
  const select = (id: string) => {
    setSelected(id);
    setText(data.conversations.find((c) => c.id === id)?.draft ?? "");
    setAttachment("");
    void mutate((d) => {
      d.conversations.find((c) => c.id === id)!.unread = 0;
    }, "");
  };
  return (
    <>
      <div className="crm-filterbar">
        <Select
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={["WhatsApp", "Email", "Website", "SMS"]}
          all="All channels"
        />
        <label>
          <input type="checkbox" checked={unread} onChange={(e) => setUnread(e.target.checked)} />{" "}
          Unread only
        </label>
        <input
          aria-label="Search conversations"
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {history && (
        <Table
          rows={rows}
          onOpen={(c) => select(c.id)}
          label="conversations"
          columns={[
            { key: "name", label: "Contact" },
            { key: "channel", label: "Channel" },
            {
              key: "ownerId",
              label: "Sales owner",
              value: (c) => data.team.find((t) => t.id === c.ownerId)?.name ?? "Unassigned",
            },
            {
              key: "createdAt",
              label: "Last interaction",
              value: (c) =>
                dateLabel(
                  data.messages.filter((m) => m.conversationId === c.id).at(-1)?.createdAt ??
                    c.createdAt,
                ),
            },
            { key: "unread", label: "Unread" },
            {
              key: "leadId",
              label: "Related lead",
              value: (c) => data.leads.find((l) => l.id === c.leadId)?.name ?? "",
            },
            {
              key: "booking",
              label: "Booking",
              value: (c) => data.bookings.find((b) => b.leadId === c.leadId)?.name ?? "—",
            },
            { key: "status", label: "Status" },
          ]}
        />
      )}
      <div className="crm-inbox">
        <aside className="crm-conversation-list">
          <h2>
            Conversations <Badge>{rows.length}</Badge>
          </h2>
          {rows.map((row) => {
            const msg = data.messages.filter((m) => m.conversationId === row.id).at(-1);
            return (
              <button
                key={row.id}
                className={selected === row.id ? "active" : ""}
                onClick={() => select(row.id)}
              >
                <span className="crm-avatar small">{row.name[0]}</span>
                <span>
                  <strong>{row.name}</strong>
                  <small>{msg?.text.slice(0, 65) ?? "Start a local conversation"}</small>
                  <em>
                    {row.channel} · {dateLabel(msg?.createdAt ?? row.createdAt)}
                  </em>
                </span>
                {row.unread > 0 && <b>{row.unread}</b>}
              </button>
            );
          })}
          {!rows.length && <Empty text="No matching conversations" />}
        </aside>
        <section className="crm-conversation">
          {c ? (
            <>
              <header>
                <span className="crm-avatar">{c.name[0]}</span>
                <div>
                  <h2>{c.name}</h2>
                  <small>{c.channel} · local sample conversation</small>
                </div>
                <Select
                  label="Conversation status"
                  value={c.status}
                  onChange={(s) =>
                    void mutate((d) => {
                      d.conversations.find((x) => x.id === c.id)!.status = s;
                    })
                  }
                  options={["Open", "Resolved"]}
                />
              </header>
              <div className="crm-messages">
                {data.messages
                  .filter((m) => m.conversationId === c.id)
                  .map((m) => (
                    <article
                      key={m.id}
                      className={`crm-message ${m.direction === "Incoming" ? "incoming" : "outgoing"} ${m.direction === "Internal note" ? "internal" : ""}`}
                    >
                      <small>
                        {m.direction} · {new Date(m.createdAt).toLocaleString("en-IN")}
                      </small>
                      <p>{m.text}</p>
                      {m.attachment && (
                        <small>
                          <Paperclip size={12} /> {m.attachment} · filename only, not uploaded
                        </small>
                      )}
                    </article>
                  ))}
              </div>
              <div className="crm-composer">
                <label>
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />{" "}
                  Internal note
                </label>
                <textarea
                  aria-label="Message composer"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={internal ? "Add a private local note…" : "Write a mock reply…"}
                />
                {attachment && (
                  <p>
                    {attachment} <Button onClick={() => setAttachment("")}>Remove</Button>
                  </p>
                )}
                <div className="crm-actions">
                  <label className="crm-btn">
                    <Paperclip size={16} />
                    Attach filename
                    <input
                      className="sr-only"
                      type="file"
                      onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                  <Button
                    onClick={() =>
                      void mutate((d) => {
                        d.conversations.find((x) => x.id === c.id)!.draft = text;
                      }, "Draft saved locally")
                    }
                  >
                    Save draft
                  </Button>
                  <Button
                    className="primary"
                    disabled={!text.trim()}
                    onClick={() =>
                      void mutate(
                        (d) => {
                          d.messages.push({
                            id: uid(),
                            createdAt: isoNow(),
                            conversationId: c.id,
                            text,
                            direction: internal ? "Internal note" : "Mock outgoing · not delivered",
                            attachment,
                          });
                          d.conversations.find((x) => x.id === c.id)!.draft = "";
                          audit(
                            d,
                            internal ? "Note Added" : "Mock Message Saved",
                            "conversations",
                            c.id,
                            text,
                            c.leadId,
                          );
                        },
                        internal
                          ? "Internal note saved"
                          : "Mock message saved; no external delivery",
                      ).then((ok) => {
                        if (ok) {
                          setText("");
                          setAttachment("");
                        }
                      })
                    }
                  >
                    <Send size={15} />
                    {internal ? "Save note" : "Mock send"}
                  </Button>
                </div>
                <small>Messages and attachments are not sent to any external service.</small>
              </div>
            </>
          ) : (
            <Empty text="Choose a conversation" />
          )}
        </section>
        <aside className="crm-contact-panel">
          {l && (
            <>
              <span className="crm-avatar large">{l.name[0]}</span>
              <h2>{l.name}</h2>
              <p>{l.company}</p>
              <Badge>{l.status}</Badge>
              <dl>
                <dt>Email</dt>
                <dd>{l.email || "—"}</dd>
                <dt>Mobile</dt>
                <dd>{l.mobile || "—"}</dd>
                <dt>Sales owner</dt>
                <dd>{data.team.find((t) => t.id === l.ownerId)?.name ?? "Unassigned"}</dd>
                <dt>Next follow-up</dt>
                <dd>{dateLabel(l.nextFollowup)}</dd>
                <dt>Related opportunity</dt>
                <dd>{data.opportunities.find((o) => o.leadId === l.id)?.name ?? "None"}</dd>
              </dl>
              <Button onClick={() => ui.lead(l.id)}>View contact profile</Button>
              <Button onClick={() => ui.form({ kind: "followups", leadId: l.id })}>
                Schedule follow-up
              </Button>
              <h3>Recent activity</h3>
              {data.activities
                .filter((a) => a.leadId === l.id)
                .slice(0, 4)
                .map((a) => (
                  <p key={a.id}>
                    <strong>{a.action}</strong>
                    <small>{dateLabel(a.createdAt)}</small>
                  </p>
                ))}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
export function EmailSms() {
  const { data, mutate } = useCrm();
  const ui = useCrmUI();
  const [tab, setTab] = useState("Templates");
  const types: Record<string, string> = {
    Templates: "Template",
    Drafts: "Draft",
    Scheduled: "Scheduled (mock)",
  };
  return (
    <>
      <div className="crm-section-actions">
        <div className="crm-tabs">
          {["Templates", "Drafts", "Scheduled", "Mock history", "Channel settings"].map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <Button className="primary" onClick={() => ui.form({ kind: "templates" })}>
          <Plus size={15} />
          Create template / draft
        </Button>
      </div>
      {tab === "Channel settings" ? (
        <Panel title="Delivery configuration">
          <p className="crm-pad">
            Email and SMS providers are not connected. Templates, drafts and schedules remain local.
            No background delivery runs.
          </p>
          <a href="/crm/integrations" className="crm-btn">
            Configure integration preview
          </a>
        </Panel>
      ) : tab === "Mock history" ? (
        <Table
          rows={data.messages.filter((m) => m.direction.startsWith("Mock"))}
          label="mock messages"
          columns={[
            { key: "text", label: "Message" },
            { key: "direction", label: "Delivery status" },
            { key: "createdAt", label: "Date", render: (m) => dateLabel(m.createdAt) },
          ]}
        />
      ) : (
        <div className="crm-integration-grid">
          {data.templates
            .filter((t) => t.status === types[tab])
            .map((t) => (
              <Panel key={t.id}>
                <Badge>{t.channel}</Badge>
                <h2>{t.name}</h2>
                <p>{t.subject}</p>
                <p>{t.body}</p>
                {t.scheduledAt && (
                  <small>Mock schedule: {new Date(t.scheduledAt).toLocaleString("en-IN")}</small>
                )}
                <div className="crm-actions">
                  <Button onClick={() => ui.form({ kind: "templates", id: t.id })}>Edit</Button>
                  <Button
                    onClick={() =>
                      void mutate((d) => {
                        d.templates.push({
                          ...t,
                          id: uid(),
                          createdAt: isoNow(),
                          name: `${t.name} copy`,
                          status: "Draft",
                        });
                        audit(d, "Template Duplicated", "templates", t.id, t.name);
                      })
                    }
                  >
                    Use as draft
                  </Button>
                  <Button
                    onClick={() => {
                      if (window.confirm(`Delete ${t.name}?`))
                        void mutate((d) => {
                          d.templates = d.templates.filter((x) => x.id !== t.id);
                          audit(d, "Template Deleted", "templates", t.id, t.name);
                        });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Panel>
            ))}
          {!data.templates.some((t) => t.status === types[tab]) && (
            <Empty text={`No ${tab.toLowerCase()} yet`} />
          )}
        </div>
      )}
    </>
  );
}
