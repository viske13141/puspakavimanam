export const DEMO_DATE = "2026-10-10";
export const DEMO_TIME = "10:30";
export const kinds = [
  "bookings",
  "flights",
  "operators",
  "aircraft",
  "crew",
  "passengers",
  "sites",
  "tasks",
  "checks",
  "compliance",
  "incidents",
  "hems",
  "documents",
  "notifications",
  "profile",
  "requests",
  "quotes",
  "blocks",
  "messages",
] as const;
export type Kind = (typeof kinds)[number];
export type Fields = Record<string, string>;
export interface Entry {
  id: string;
  name: string;
  status: string;
  fields: Fields;
  history: string[];
}
export type Database = Record<Kind, Entry[]>;
export interface State {
  data: Database;
  revision: number;
}
export type Action =
  | {
      type: "patch";
      kind: Kind;
      id: string;
      fields?: Fields;
      status?: string;
      name?: string;
      message: string;
    }
  | { type: "add"; kind: Kind; entry: Entry }
  | { type: "read-all" };
export const flightStatuses = [
  "Scheduled",
  "Preparing",
  "Ready",
  "Boarding",
  "Departed",
  "Airborne",
  "Landed",
  "Completed",
  "Delayed",
  "Cancelled",
  "Diverted",
];
export const assignmentStatuses = [
  "Unassigned",
  "Assignment Requested",
  "Operator Reviewing",
  "Accepted",
  "Declined",
  "Reassignment Required",
];
export const checkStatuses = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Verified",
  "Blocked",
  "Not Applicable",
];
export const preparationSections = [
  "Aircraft Assignment",
  "Crew Assignment",
  "Passenger Manifest",
  "Weight & Balance",
  "Weather Briefing",
  "NOTAM Review",
  "Landing Permissions",
  "Ground Handling",
  "Catering & Additional Load",
  "Emergency Equipment",
  "Flight Documentation",
  "Operator Confirmation",
];
export const complianceCategories = [
  "Passenger Documentation",
  "Crew Documentation",
  "Aircraft Documents",
  "Weight & Balance",
  "Dangerous Goods",
  "Catering",
  "Landing Permissions",
  "Passenger Safety Briefings",
  "Medical/HEMS Requirements",
];
export function find(data: Database, kind: Kind, id: string | undefined) {
  return data[kind].find((r) => r.id === id);
}
export function value(row: Entry, key: string): string {
  return key === "name"
    ? row.name
    : key === "id"
      ? row.id
      : key === "status"
        ? row.status
        : (row.fields[key] ?? "");
}
export function flightFor(data: Database, row: Entry) {
  return find(data, "flights", row.fields["flight"]);
}
export function label(data: Database, row: Entry, key: string): string {
  const refs: Record<string, Kind> = {
    flight: "flights",
    booking: "bookings",
    operator: "operators",
    aircraft: "aircraft",
    site: "sites",
    crew: "crew",
    request: "requests",
  };
  const kind = refs[key];
  const raw = value(row, key);
  if (kind) return find(data, kind, raw)?.name ?? "Unassigned";
  return raw || "—";
}
export function dateOffset(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function conflicts(
  data: Database,
  flight: Entry,
  date: string,
  time: string,
  aircraft = flight.fields["aircraft"],
): Entry[] {
  if (!aircraft) return [];
  const start = Date.parse(`${date}T${time}:00Z`);
  const duration = Number(flight.fields["duration"] || "60") * 60000;
  return data.flights.filter((other) => {
    if (
      other.id === flight.id ||
      other.status === "Cancelled" ||
      other.fields["aircraft"] !== aircraft
    )
      return false;
    const otherStart = Date.parse(`${other.fields["date"]}T${other.fields["departure"]}:00Z`);
    return (
      start < otherStart + Number(other.fields["duration"] || "60") * 60000 &&
      start + duration > otherStart
    );
  });
}
export function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (cell) => '"' + (/^[=+@\-\t\r]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""') + '"',
        )
        .join(","),
    )
    .join("\r\n");
}
export function reducer(state: State, action: Action): State {
  if (action.type === "read-all")
    return {
      revision: state.revision + 1,
      data: {
        ...state.data,
        notifications: state.data.notifications.map((n) => ({ ...n, status: "Read" })),
      },
    };
  if (action.type === "add") {
    if (state.data[action.kind].some((r) => r.id === action.entry.id)) return state;
    return {
      revision: state.revision + 1,
      data: { ...state.data, [action.kind]: [action.entry, ...state.data[action.kind]] },
    };
  }
  const entries = state.data[action.kind].map((row) =>
    row.id === action.id
      ? {
          ...row,
          name: action.name ?? row.name,
          status: action.status ?? row.status,
          fields: { ...row.fields, ...action.fields },
          history: [...row.history, `Demo update ${state.revision + 1} · ${action.message}`],
        }
      : row,
  );
  return { revision: state.revision + 1, data: { ...state.data, [action.kind]: entries } };
}

export function companyData(data: Database, company: string): Database {
  const flights = data.flights.filter((f) => f.fields["operator"] === company);
  const flightIds = new Set(flights.map((f) => f.id));
  const bookings = new Set(flights.map((f) => f.fields["booking"]));
  const owned = (kind: Kind, row: Entry) => {
    if (kind === "operators") return row.id === company;
    if (kind === "bookings" || kind === "passengers")
      return bookings.has(kind === "bookings" ? row.id : row.fields["booking"]);
    if (["aircraft", "crew", "requests", "quotes", "blocks", "messages", "profile"].includes(kind))
      return row.fields["operator"] === company;
    if (kind === "sites") return flights.some((f) => f.fields["site"] === row.id);
    return flightIds.has(kind === "flights" ? row.id : (row.fields["flight"] ?? ""));
  };
  return Object.fromEntries(
    kinds.map((kind) => [kind, data[kind].filter((row) => owned(kind, row))]),
  ) as Database;
}
export function canApplyCompanyAction(data: Database, company: string, action: Action): boolean {
  const scoped = companyData(data, company);
  if (action.type === "read-all") return true;
  if (action.kind === "operators" || action.kind === "bookings") return false;
  const fields = action.type === "patch" ? (action.fields ?? {}) : action.entry.fields;
  if (action.type === "patch" && !scoped[action.kind].some((r) => r.id === action.id)) return false;
  if (fields["operator"] && fields["operator"] !== company) return false;
  const refs: Record<string, Kind> = {
    aircraft: "aircraft",
    flight: "flights",
    booking: "bookings",
    crew: "crew",
    request: "requests",
    proposedFlight: "flights",
  };
  if (
    Object.entries(refs).some(
      ([field, kind]) => fields[field] && !scoped[kind].some((r) => r.id === fields[field]),
    )
  )
    return false;
  if (action.type === "add" && fields["operator"] !== company) return false;
  if (
    action.kind === "profile" &&
    (fields["aoc"] ||
      fields["licence"] ||
      fields["verification"] ||
      (action.type === "patch" && action.status))
  )
    return false;
  return true;
}
export function quoteTotal(fields: Fields): number {
  const n = (key: string) => Math.max(0, Number(fields[key] || 0));
  const base =
    n("hourlyRate") * n("hours") + n("positioning") + n("landing") + n("handling") + n("other");
  return Math.round(base * (1 + n("tax") / 100) * 100) / 100;
}
export function displayRow(data: Database, kind: Kind, row: Entry): Entry {
  const flight =
    kind === "flights"
      ? row
      : kind === "bookings"
        ? data.flights.find((f) => f.fields["booking"] === row.id)
        : flightFor(data, row);
  const booking =
    kind === "bookings"
      ? row
      : find(data, "bookings", row.fields["booking"] || flight?.fields["booking"]);
  const linkedFlights = data.flights.filter(
    (f) => f.fields["booking"] === (kind === "bookings" ? row.id : row.fields["booking"]),
  );
  const count = data.passengers.filter((p) => p.fields["booking"] === booking?.id).length;
  const fields: Fields = { ...row.fields };
  if (flight) {
    for (const key of [
      "aircraft",
      "operator",
      "departure",
      "arrival",
      "date",
      "booking",
      "crew",
      "assignment",
      "readiness",
    ])
      if (!fields[key]) fields[key] = flight.fields[key] ?? "";
    fields["flightStatus"] = flight.status;
    const checks = data.checks.filter((c) => c.fields["flight"] === flight.id);
    fields["readiness"] = checks.some((c) => c.status === "Blocked")
      ? "Blocked"
      : checks.every((c) => ["Verified", "Not Applicable"].includes(c.status))
        ? "Ready"
        : "In Progress";
  }
  if (booking) {
    for (const key of ["customer", "origin", "destination", "service", "coordinator"])
      fields[key] = booking.fields[key] ?? "";
    fields["passengerCount"] = String(count);
  }
  fields["route"] = `${fields["origin"] ?? "—"} → ${fields["destination"] ?? "—"}`;
  if (kind === "passengers" || kind === "bookings")
    fields["relatedFlights"] = linkedFlights.map((f) => f.name).join(", ");
  if (kind === "operators") {
    fields["fleetSize"] = String(
      data.aircraft.filter((a) => a.fields["operator"] === row.id).length,
    );
    fields["assignedCount"] = String(
      data.flights.filter((f) => f.fields["operator"] === row.id).length,
    );
  }
  if (kind === "aircraft")
    fields["nextFlight"] =
      data.flights
        .filter(
          (f) => f.fields["aircraft"] === row.id && !["Completed", "Cancelled"].includes(f.status),
        )
        .map((f) => f.name)
        .join(", ") || "No assignment";
  if (kind === "quotes")
    fields["total"] = quoteTotal(row.fields).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return { ...row, fields };
}
