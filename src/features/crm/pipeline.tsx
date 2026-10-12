import { useState } from "react";
import { GripVertical, Plus, Clock } from "lucide-react";
import { useCrm } from "./store";
import { useCrmUI } from "./layout";
import { moveOpportunity } from "./repository";
import { compactMoney, dateLabel, DEMO_NOW, services } from "./model";
import { Badge, Button, Field, Modal, Select } from "./ui";
export function Pipeline() {
  const { data, mutate, busy } = useCrm();
  const ui = useCrmUI();
  const [search, setSearch] = useState(""),
    [owner, setOwner] = useState(""),
    [service, setService] = useState(""),
    [lost, setLost] = useState(""),
    [reason, setReason] = useState("");
  const move = (id: string, stage: string) => {
    if (stage === "Lost") {
      setLost(id);
      setReason("");
    } else
      void mutate(
        (d) => moveOpportunity(d, id, stage),
        "Opportunity stage updated; booking records unchanged",
      );
  };
  const rows = data.opportunities.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) &&
      (!owner || o.ownerId === owner) &&
      (!service || data.leads.find((l) => l.id === o.leadId)?.service === service),
  );
  return (
    <>
      <div className="crm-filterbar">
        <input
          aria-label="Search opportunities"
          placeholder="Search opportunities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Service filter"
          value={service}
          onChange={setService}
          options={services}
          all="All services"
        />
        <select aria-label="Owner filter" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All owners</option>
          {data.team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="crm-filter-note">
          {rows.length} opportunities · {compactMoney(rows.reduce((s, o) => s + o.value, 0))}
        </span>
        <Button className="primary" onClick={() => ui.form({ kind: "opportunities" })}>
          <Plus size={16} />
          Add opportunity
        </Button>
      </div>
      <p className="crm-muted crm-pad">
        Drag cards between stages, or use the stage selector. “Booked” records a sales outcome only.
      </p>
      <div className="crm-kanban">
        {data.settings.stages.map((stage, i) => {
          const cards = rows.filter((o) => o.stage === stage);
          return (
            <section
              key={stage}
              className="crm-kanban-column"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (data.opportunities.some((o) => o.id === id)) move(id, stage);
              }}
            >
              <header>
                <i
                  style={{
                    background: [
                      "#ad9974",
                      "#8198ac",
                      "#829a89",
                      "#b5a77f",
                      "#a08d9c",
                      "#4b8c6c",
                      "#b37671",
                    ][i % 7],
                  }}
                />
                <h2>{stage}</h2>
                <span>{cards.length}</span>
                <small>{compactMoney(cards.reduce((s, o) => s + o.value, 0))}</small>
              </header>
              {cards.map((o) => {
                const l = data.leads.find((l) => l.id === o.leadId)!;
                return (
                  <article
                    className="crm-opportunity"
                    draggable={!busy}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                    key={o.id}
                  >
                    <div className="crm-card-top">
                      <Badge>{l.service}</Badge>
                      <GripVertical size={15} />
                    </div>
                    <button className="crm-card-name" onClick={() => ui.lead(l.id)}>
                      {l.name}
                    </button>
                    <p>
                      {l.departure} → {l.destination}
                    </p>
                    <strong className="crm-card-value">{compactMoney(o.value)}</strong>
                    <div className="crm-card-meta">
                      <span>{l.source}</span>
                      <Badge>{l.priority}</Badge>
                    </div>
                    <div className="crm-card-owner">
                      <span className="crm-avatar small">
                        {data.team.find((t) => t.id === o.ownerId)?.name[0] ?? "?"}
                      </span>
                      <span>{data.team.find((t) => t.id === o.ownerId)?.name ?? "Unassigned"}</span>
                    </div>
                    <div
                      className={`crm-card-due ${l.nextFollowup && Date.parse(l.nextFollowup) < Date.parse(DEMO_NOW) ? "overdue" : ""}`}
                    >
                      <Clock size={12} />
                      {dateLabel(l.nextFollowup)}
                      {l.nextFollowup && Date.parse(l.nextFollowup) < Date.parse(DEMO_NOW)
                        ? " · Overdue"
                        : ""}
                    </div>
                    <small>
                      Last activity:{" "}
                      {dateLabel(
                        data.activities.find((a) => a.leadId === l.id)?.createdAt ?? l.createdAt,
                      )}
                    </small>
                    <div className="crm-actions">
                      <Select
                        label={`Move ${o.name}`}
                        value={o.stage}
                        onChange={(stage) => move(o.id, stage)}
                        options={data.settings.stages}
                      />
                      <Button onClick={() => ui.form({ kind: "opportunities", id: o.id })}>
                        Edit
                      </Button>
                    </div>
                    {o.lossReason && <p>Loss reason: {o.lossReason}</p>}
                  </article>
                );
              })}
              <Button onClick={() => ui.form({ kind: "opportunities" })}>
                <Plus size={14} />
                Add opportunity
              </Button>
            </section>
          );
        })}
      </div>
      {lost && (
        <Modal title="Record loss reason" onClose={() => setLost("")}>
          <Field label="Why was this opportunity lost?">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
          </Field>
          <Button
            disabled={!reason.trim()}
            className="primary"
            onClick={() =>
              void mutate((d) => moveOpportunity(d, lost, "Lost", reason)).then((ok) => {
                if (ok) setLost("");
              })
            }
          >
            Move to Lost
          </Button>
        </Modal>
      )}
    </>
  );
}
