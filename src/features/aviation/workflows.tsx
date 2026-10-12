import { useState } from "react";
import { Plus, Check, AlertTriangle, Radio } from "lucide-react";
import { Badge, Button, DataTable, Filter, Notice, Panel, Tabs, useWorkspaceUI } from "./ui";
import { useOperations } from "./store";
import { useRecordActions } from "./actions";
import { assignmentStatuses, checkStatuses, flightStatuses } from "./config";
import { DEMO_DATE, displayRow, find, label, type Entry } from "./model";
import { Heading, Stats, flightColumns, usePageQuery } from "./pages";
export function Assignments() {
  const {
    state: { data },
  } = useOperations();
  const a = useRecordActions();
  const ui = useWorkspaceUI();
  const q = usePageQuery();
  const [view, setView] = useState("Kanban");
  const [search, setSearch] = useState(q);
  const [status, setStatus] = useState("");
  const rows = data.flights.filter(
    (f) =>
      (!status || f.fields["assignment"] === status) &&
      [f.name, f.id, label(data, f, "operator"), label(data, f, "booking")]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const controls = (f: Entry) => (
    <>
      <button className="av-text-button" onClick={() => a.assign(f)}>
        {f.fields["operator"] ? "Change operator" : "Assign operator"}
      </button>
      <button
        className="av-text-button"
        onClick={() =>
          a.edit("flights", f, ["assignment", "notes"], "Record operator response · simulation")
        }
      >
        Record response
      </button>
      <button
        className="av-text-button"
        onClick={() =>
          a.edit("flights", f, ["assignment", "reason"], "Request reassignment · simulation")
        }
      >
        Reassign
      </button>
      {f.fields["operator"] && (
        <button
          className="av-text-button"
          onClick={() => ui.inspect("operators", f.fields["operator"]!)}
        >
          Operator
        </button>
      )}
    </>
  );
  return (
    <>
      <Heading
        page="assignments"
        description="Coordinate operator responses and aircraft proposals in one shared assignment board."
      />
      <div className="av-toolbar">
        <Tabs values={["Kanban", "Table"]} selected={view} onChange={setView} />
        <div className="av-actions">
          <input
            aria-label="Search assignments"
            placeholder="Flight, PNR or operator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Filter
            label="Assignment stage"
            value={status}
            values={assignmentStatuses.map((value) => ({ value, label: value }))}
            onChange={setStatus}
          />
        </div>
      </div>
      {view === "Table" ? (
        <Panel title="Assignment register">
          <DataTable
            rows={rows}
            kind="flights"
            columns={flightColumns
              .filter((c) => !["readiness", "arrival", "status"].includes(c.key))
              .concat({ key: "coordinator", title: "Coordinator" }, { key: "date", title: "Date" })}
            actions={controls}
          />
        </Panel>
      ) : (
        <div className="av-kanban">
          {assignmentStatuses.map((stage) => (
            <section className="av-kanban-column" key={stage}>
              <h3>
                {stage}
                <span>{rows.filter((f) => f.fields["assignment"] === stage).length}</span>
              </h3>
              {rows
                .filter((f) => f.fields["assignment"] === stage)
                .map((f) => (
                  <div className="av-kanban-card" key={f.id}>
                    <button className="av-record-link" onClick={() => ui.inspect("flights", f.id)}>
                      {f.name}
                    </button>
                    <p>
                      {displayRow(data, "flights", f).fields["route"]}
                      <br />
                      {f.fields["date"]} · {f.fields["departure"]}
                      <br />
                      {label(data, f, "aircraft")}
                      <br />
                      {label(data, f, "operator")}
                    </p>
                    <div className="av-actions">{controls(f)}</div>
                  </div>
                ))}
            </section>
          ))}
        </div>
      )}
      <Notice>
        Assignment notifications and responses are simulated. Open a flight to review its assignment
        history.
      </Notice>
    </>
  );
}
export function Preparation() {
  const {
    state: { data },
  } = useOperations();
  const q = usePageQuery();
  const a = useRecordActions();
  const ui = useWorkspaceUI();
  const [flightId, setFlightId] = useState(
    data.flights.find((f) => f.id === q || f.name === q)?.id ?? data.flights[0]?.id ?? "",
  );
  const flight = find(data, "flights", flightId);
  const checks = data.checks.filter((c) => c.fields["flight"] === flightId);
  const done = checks.filter((c) => ["Verified", "Not Applicable"].includes(c.status)).length;
  const blocked = checks.filter((c) => c.status === "Blocked").length;
  return (
    <>
      <Heading
        page="preparation"
        description="A coordinated preparation record, with clear ownership and evidence at every step."
      />
      <label className="av-field mb-5 max-w-lg">
        <span>Choose flight</span>
        <select
          aria-label="Preparation flight"
          value={flightId}
          onChange={(e) => setFlightId(e.target.value)}
        >
          {data.flights.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {displayRow(data, "flights", f).fields["route"]}
            </option>
          ))}
        </select>
      </label>
      <Notice>
        Preparation and evidence tracking only. This interface cannot authorize flight release,
        takeoff, departure or override pilot-in-command authority.
      </Notice>
      <Stats
        items={[
          { label: "Completed checks", value: done },
          { label: "Pending checks", value: checks.length - done - blocked },
          { label: "Blocked checks", value: blocked },
          {
            label: "Missing / unreviewed evidence",
            value: checks.filter((c) => !["Verified", "Not Applicable"].includes(c.status)).length,
          },
        ]}
      />
      <Panel
        title={`${flight?.name ?? "Select a flight"} · Preparation workspace`}
        caption={`${done} of ${checks.length} checks complete in the demo`}
        action={
          flight && <Button onClick={() => ui.inspect("flights", flight.id)}>Flight summary</Button>
        }
      >
        <div className="p-5">
          <div
            className="av-progress"
            role="progressbar"
            aria-label="Preparation progress"
            aria-valuenow={checks.length ? Math.round((done / checks.length) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${checks.length ? (done / checks.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="av-checklist">
          {checks.map((c, i) => (
            <div className="av-check-row" key={c.id}>
              <span className="av-muted">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1">
                <strong>{c.name}</strong>
                <p>
                  {c.fields["responsible"]} · {c.fields["updated"]}
                </p>
                <p>{c.fields["notes"]}</p>
              </div>
              <Badge>{c.status}</Badge>
              <div className="av-actions">
                <button
                  className="av-text-button"
                  onClick={() =>
                    ui.inspect("documents", c.fields["evidence"] ?? c.fields["document"] ?? "")
                  }
                >
                  Evidence
                </button>
                <Button
                  onClick={() =>
                    a.edit(
                      "checks",
                      c,
                      ["status", "responsible", "evidence", "notes"],
                      "Update preparation check · demo",
                      checkStatuses,
                    )
                  }
                >
                  Update check
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
export function Checkin() {
  const {
    state: { data },
  } = useOperations();
  const a = useRecordActions();
  const [flightId, setFlightId] = useState(data.flights[0]?.id ?? "");
  const flight = find(data, "flights", flightId);
  const pax = data.passengers.filter((p) => p.fields["booking"] === flight?.fields["booking"]);
  const cleared = pax.filter((p) => p.status === "Cleared").length;
  return (
    <>
      <Heading
        page="checkin"
        description="Review the fictional manifest and coordinate passenger readiness."
      />
      <Notice>
        DEMO-ONLY CHECK-IN. A simulated Cleared status is not a boarding authorization.
      </Notice>
      <label className="av-field mb-5 max-w-lg">
        <span>Select flight manifest</span>
        <select
          aria-label="Check-in flight"
          value={flightId}
          onChange={(e) => setFlightId(e.target.value)}
        >
          {data.flights.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {label(data, f, "booking")}
            </option>
          ))}
        </select>
      </label>
      <Stats
        items={[
          { label: "Total passengers", value: pax.length },
          { label: "Checked in · demo", value: cleared },
          {
            label: "Pending / under review",
            value: pax.filter((p) => ["Pending", "Under Review"].includes(p.status)).length,
          },
          { label: "Blocked", value: pax.filter((p) => p.status === "Blocked").length },
        ]}
      />
      <Panel
        title="Boarding progress · demo"
        caption={`${cleared} / ${pax.length} passengers cleared in this simulation`}
      >
        <div className="p-5">
          <div
            className="av-progress"
            role="progressbar"
            aria-label="Demo boarding progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pax.length ? Math.round((cleared / pax.length) * 100) : 0}
          >
            <span style={{ width: `${pax.length ? (cleared / pax.length) * 100 : 0}%` }} />
          </div>
        </div>
        <DataTable
          kind="passengers"
          rows={pax}
          columns={[
            { key: "name", title: "Passenger" },
            { key: "maskedId", title: "Masked ID" },
            { key: "identity", title: "Identity evidence" },
            { key: "bodyWeight", title: "Measured kg" },
            { key: "baggageWeight", title: "Baggage kg" },
            { key: "status", title: "Check-in" },
          ]}
          actions={(p) => <Button onClick={() => a.checkin(p)}>Review check-in</Button>}
        />
      </Panel>
    </>
  );
}
export function Monitoring() {
  const {
    state: { data },
    mode,
  } = useOperations();
  const a = useRecordActions();
  const ui = useWorkspaceUI();
  const q = usePageQuery();
  const [status, setStatus] = useState("");
  function update(f: Entry, action: "departure" | "arrival" | "delay" | "status") {
    const keys =
      action === "departure"
        ? ["actualDeparture", "notes"]
        : action === "arrival"
          ? ["actualArrival", "notes"]
          : action === "delay"
            ? ["reason", "arrival", "notes"]
            : ["status", "notes"];
    ui.form({
      title: `Record ${action} · demo ${f.name}`,
      description:
        "Manual fictional update. No aircraft telemetry or operational clearance is connected.",
      fields: keys.map((k) => a.spec(k, "flights", flightStatuses)),
      initial: { ...f.fields, status: f.status },
      save: (v) => {
        const next =
          action === "departure"
            ? "Departed"
            : action === "arrival"
              ? "Landed"
              : action === "delay"
                ? "Delayed"
                : v["status"]!;
        a.patch(
          "flights",
          f,
          {
            ...v,
            lastUpdate:
              new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " · demo",
          },
          `Demo ${action} recorded`,
          next,
        );
      },
    });
  }
  return (
    <>
      <Heading
        page={mode === "operator" ? "flights" : "monitoring"}
        description="A shared movement board with manually recorded demo updates."
      />
      <Notice>
        This is not real-time aircraft tracking. Flight movements are simulated locally and are not
        operational instructions.
      </Notice>
      <Stats
        items={["Scheduled", "Preparing", "Airborne", "Delayed", "Diverted", "Landed"].map((s) => ({
          label: s,
          value: data.flights.filter((f) => f.status === s).length,
          icon: Radio,
          click: () => setStatus(s),
        }))}
      />
      <div className="av-filter-bar">
        <Filter
          label="Flight status"
          value={status}
          values={flightStatuses.map((value) => ({ value, label: value }))}
          onChange={setStatus}
        />
      </div>
      <Panel title="Flight movement log">
        <DataTable
          key={q}
          kind="flights"
          initialQuery={q}
          rows={data.flights.filter((f) => !status || f.status === status)}
          columns={[
            { key: "name", title: "Flight" },
            { key: "route", title: "Route" },
            { key: "aircraft", title: "Aircraft" },
            { key: "operator", title: "Operator" },
            { key: "departure", title: "Scheduled departure" },
            { key: "actualDeparture", title: "Actual departure" },
            { key: "arrival", title: "Estimated arrival" },
            { key: "actualArrival", title: "Actual arrival" },
            { key: "status", title: "Status" },
            { key: "lastUpdate", title: "Last update" },
          ]}
          actions={(f) => (
            <>
              <button className="av-text-button" onClick={() => update(f, "departure")}>
                Departure
              </button>
              <button className="av-text-button" onClick={() => update(f, "arrival")}>
                Arrival
              </button>
              <button className="av-text-button" onClick={() => update(f, "delay")}>
                Delay
              </button>
              <button className="av-text-button" onClick={() => update(f, "status")}>
                Status
              </button>
              <button className="av-text-button" onClick={() => a.incident("Diversion", f)}>
                Diversion
              </button>
              {mode === "operator" && (
                <button
                  className="av-text-button"
                  onClick={() =>
                    a.edit(
                      "flights",
                      f,
                      ["assignment", "notes"],
                      "Record assignment response · demo",
                    )
                  }
                >
                  Assignment response
                </button>
              )}
            </>
          )}
        />
      </Panel>
    </>
  );
}
