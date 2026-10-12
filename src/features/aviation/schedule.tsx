import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Plane, CalendarDays, Clock3 } from "lucide-react";
import { useOperations } from "./store";
import { Badge, Button, DataTable, Empty, Filter, Notice, Panel, Tabs, useWorkspaceUI } from "./ui";
import { useRecordActions } from "./actions";
import { Heading, flightColumns, usePageQuery } from "./pages";
import { DEMO_DATE, conflicts, dateOffset, displayRow, find, label, type Entry } from "./model";
export function Schedule({ availability = false }: { availability?: boolean }) {
  const {
    state: { data },
    mode,
  } = useOperations();
  const ui = useWorkspaceUI();
  const actions = useRecordActions();
  const q = usePageQuery();
  const [view, setView] = useState(availability ? "Aircraft Timeline" : "Week");
  const [date, setDate] = useState(DEMO_DATE);
  const [aircraft, setAircraft] = useState("");
  const [operator, setOperator] = useState("");
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState(q);
  const flights = data.flights.filter(
    (f) =>
      (!aircraft || f.fields["aircraft"] === aircraft) &&
      (!operator || f.fields["operator"] === operator) &&
      (!service || displayRow(data, "flights", f).fields["service"] === service) &&
      (!location || find(data, "aircraft", f.fields["aircraft"])?.fields["base"] === location) &&
      [
        f.id,
        f.name,
        ...Object.keys(displayRow(data, "flights", f).fields).map((k) =>
          label(data, displayRow(data, "flights", f), k),
        ),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const fleet = data.aircraft.filter(
    (a) =>
      (!aircraft || a.id === aircraft) &&
      (!operator || a.fields["operator"] === operator) &&
      (!location || a.fields["base"] === location),
  );
  const first = view === "Month" ? date.slice(0, 7) + "-01" : date;
  const cells =
    view === "Month"
      ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate()
      : view === "Day"
        ? 1
        : 7;
  const dates = Array.from({ length: cells }, (_, i) => dateOffset(first, i));
  const conflictFlights = flights.filter(
    (f) => conflicts(data, f, f.fields["date"]!, f.fields["departure"]!).length > 0,
  );
  function shift(direction: number) {
    if (view === "Month") {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(dateOffset(date, direction * (view === "Day" ? 1 : 7)));
  }
  function event(f: Entry) {
    const info = displayRow(data, "flights", f);
    return (
      <button key={f.id} className="av-calendar-event" onClick={() => ui.inspect("flights", f.id)}>
        <strong>
          {f.fields["departure"]} · {f.name}
        </strong>
        <small>{info.fields["route"]}</small>
        <small>{label(data, f, "aircraft")}</small>
        <small>{label(data, f, "operator")}</small>
        <Badge>{f.status}</Badge>
        {conflictFlights.some((c) => c.id === f.id) && (
          <small className="text-red-300">Assignment overlap</small>
        )}
      </button>
    );
  }
  function blocks(day: string, aircraftId?: string) {
    return data.blocks
      .filter(
        (b) =>
          (!aircraftId || b.fields["aircraft"] === aircraftId) &&
          (!aircraft || b.fields["aircraft"] === aircraft) &&
          b.fields["start"]!.slice(0, 10) <= day &&
          b.fields["end"]!.slice(0, 10) >= day,
      )
      .map((b) => (
        <button
          key={b.id}
          className="av-calendar-event av-maintenance"
          onClick={() => actions.block(find(data, "aircraft", b.fields["aircraft"]))}
        >
          <strong>{b.status}</strong>
          <small>{label(data, b, "aircraft")}</small>
          <small>
            {b.fields["start"]?.slice(11)}–{b.fields["end"]?.slice(11)}
          </small>
        </button>
      ));
  }
  return (
    <>
      <Heading
        page={availability ? "availability" : "schedule"}
        description="Coordinate schedules and availability. Calendar events are fictional; changes remain unapproved demo proposals."
      >
        <Button onClick={() => setDate(DEMO_DATE)}>Scenario date</Button>
        {availability && (
          <Button primary onClick={() => actions.block()}>
            <Plus size={14} /> Availability block
          </Button>
        )}
      </Heading>
      <div className="av-toolbar">
        <Tabs
          values={
            availability
              ? ["Day", "Week", "Month", "Aircraft Timeline"]
              : ["Day", "Week", "Month", "List"]
          }
          selected={view}
          onChange={setView}
        />
        <div className="av-actions">
          <Button onClick={() => shift(-1)}>
            <ChevronLeft size={14} /> Previous
          </Button>
          <label>
            <span className="sr-only">Calendar date</span>
            <input
              type="date"
              aria-label="Calendar date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <Button onClick={() => shift(1)}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
      <div className="av-filter-bar">
        <Filter
          label="Aircraft"
          value={aircraft}
          values={data.aircraft.map((a) => ({ value: a.id, label: a.name }))}
          onChange={setAircraft}
        />
        {mode === "operations" && (
          <Filter
            label="Operator"
            value={operator}
            values={data.operators.map((a) => ({ value: a.id, label: a.name }))}
            onChange={setOperator}
          />
        )}
        <Filter
          label="Service type"
          value={service}
          values={["Helicopter", "Private Jet"].map((value) => ({ value, label: value }))}
          onChange={setService}
        />
        {availability && (
          <Filter
            label="Location"
            value={location}
            values={Array.from(new Set(data.aircraft.map((a) => a.fields["base"] ?? "")))
              .filter(Boolean)
              .map((value) => ({ value, label: value }))}
            onChange={setLocation}
          />
        )}
        <label className="av-filter">
          <span>Search schedule</span>
          <input
            aria-label="Search schedule"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Flight, aircraft or PNR"
          />
        </label>
        <Button
          onClick={() => {
            setAircraft("");
            setOperator("");
            setService("");
            setLocation("");
            setQuery("");
          }}
        >
          Clear filters
        </Button>
      </div>
      {conflictFlights.length > 0 && (
        <Notice>
          {conflictFlights.length} flight entries have overlapping aircraft assignments. These are
          demo conflict warnings, not an operational decision.
        </Notice>
      )}
      <Panel
        title={availability ? "Fleet availability calendar" : "Flight schedule"}
        caption={`${first} · all times IST · select an event for details`}
      >
        {view === "List" ? (
          <DataTable
            rows={flights}
            kind="flights"
            columns={[
              ...flightColumns.filter((c) => c.key !== "customer"),
              { key: "date", title: "Date" },
            ]}
            actions={(f) => (
              <button className="av-text-button" onClick={() => actions.schedule(f)}>
                Request change
              </button>
            )}
          />
        ) : view === "Aircraft Timeline" ? (
          <div className="av-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Aircraft</th>
                  {dates.map((d) => (
                    <th key={d}>{d.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fleet.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="av-record-link"
                        onClick={() => ui.inspect("aircraft", a.id)}
                      >
                        {a.name}
                      </button>
                      <div>
                        <Badge>{a.status}</Badge>
                      </div>
                    </td>
                    {dates.map((d) => (
                      <td key={d}>
                        {flights
                          .filter((f) => f.fields["date"] === d && f.fields["aircraft"] === a.id)
                          .map(event)}
                        {blocks(d, a.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === "Day" ? (
          <div className="av-day-schedule">
            {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => (
              <div className="av-time-row" key={hour}>
                <span className="av-muted">{String(hour).padStart(2, "0")}:00</span>
                <div>
                  {flights
                    .filter(
                      (f) =>
                        f.fields["date"] === date &&
                        Number(f.fields["departure"]?.split(":")[0]) === hour,
                    )
                    .map(event)}
                  {hour === 12 && blocks(date)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="av-calendar-scroll">
            <div className="av-calendar">
              {dates.map((d) => (
                <div key={d} className="av-calendar-cell">
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(d + "T12:00:00Z"))}
                  </span>
                  {flights.filter((f) => f.fields["date"] === d).map(event)}
                  {blocks(d)}
                  {data.aircraft
                    .filter(
                      (a) =>
                        a.status === "Maintenance" &&
                        a.fields["blockDate"] === d &&
                        (!aircraft || aircraft === a.id),
                    )
                    .map((a) => (
                      <button
                        key={a.id}
                        className="av-calendar-event av-maintenance"
                        onClick={() => ui.inspect("aircraft", a.id)}
                      >
                        {a.fields["registration"]} · Maintenance {a.fields["blockStart"]}–
                        {a.fields["blockEnd"]}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
      {view !== "List" && (
        <Panel
          title="Schedule coordination"
          caption="Propose a change or open the linked operational workspace"
        >
          <DataTable
            kind="flights"
            rows={flights}
            columns={[
              { key: "name", title: "Flight" },
              { key: "date", title: "Date" },
              { key: "route", title: "Route" },
              { key: "aircraft", title: "Aircraft" },
              { key: "scheduleProposal", title: "Proposal status" },
            ]}
            actions={(f) => (
              <>
                <button className="av-text-button" onClick={() => actions.schedule(f)}>
                  Request change
                </button>
                <button className="av-text-button" onClick={() => actions.go("preparation", f.id)}>
                  Preparation
                </button>
                <button
                  className="av-text-button"
                  onClick={() => actions.go("passengers", label(data, f, "booking"))}
                >
                  Manifest
                </button>
                <button
                  className="av-text-button"
                  onClick={() =>
                    actions.go(mode === "operator" ? "ground" : "ground-handling", f.name)
                  }
                >
                  Ground plan
                </button>
              </>
            )}
          />
        </Panel>
      )}
    </>
  );
}
