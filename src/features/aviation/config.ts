import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  GitBranch,
  Building2,
  Plane,
  Users,
  Contact,
  ScanLine,
  MapPin,
  Truck,
  ListChecks,
  ShieldCheck,
  Radar,
  TriangleAlert,
  HeartPulse,
  Files,
  ChartNoAxesCombined,
  Bell,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  assignmentStatuses,
  checkStatuses,
  complianceCategories,
  flightStatuses,
  preparationSections,
  type Kind,
} from "./model";
export const navigation = [
  {
    group: "Control Center",
    items: [
      ["dashboard", "Dashboard", LayoutDashboard],
      ["bookings", "Booking Handover", ClipboardCheck],
      ["schedule", "Flight Schedule", CalendarDays],
      ["assignments", "Flight Assignments", GitBranch],
    ],
  },
  {
    group: "Fleet & Crew",
    items: [
      ["operators", "Operators", Building2],
      ["aircraft", "Aircraft & Availability", Plane],
      ["crew", "Pilots & Crew", Users],
    ],
  },
  {
    group: "Passengers & Ground",
    items: [
      ["passengers", "Passenger Management", Contact],
      ["checkin", "Check-in & Boarding", ScanLine],
      ["landing-sites", "Helipads & Landing Sites", MapPin],
      ["ground-handling", "Ground Handling", Truck],
    ],
  },
  {
    group: "Flight Operations",
    items: [
      ["preparation", "Flight Preparation", ListChecks],
      ["compliance", "Compliance Center", ShieldCheck],
      ["monitoring", "Flight Monitoring", Radar],
      ["incidents", "Diversions & Incidents", TriangleAlert],
      ["hems", "Medical / HEMS", HeartPulse],
    ],
  },
  {
    group: "Management",
    items: [
      ["documents", "Documents", Files],
      ["reports", "Reports", ChartNoAxesCombined],
      ["notifications", "Notifications", Bell],
      ["profile", "My Profile", UserRound],
    ],
  },
] as const satisfies readonly {
  group: string;
  items: readonly (readonly [string, string, LucideIcon])[];
}[];
export type Page = (typeof navigation)[number]["items"][number][0];
export const pages = navigation.flatMap((g) =>
  g.items.map(([key, title, icon]) => ({ key, title, icon, group: g.group })),
);
export interface Schema {
  kind: Kind;
  description: string;
  columns: [string, string][];
  statuses: string[];
  filters: string[];
}
export const schemas: Record<string, Schema> = {
  bookings: {
    kind: "bookings",
    description: "Confirmed journeys, ready for an operational handover.",
    columns: [
      ["id", "Booking ID"],
      ["name", "PNR"],
      ["customer", "Customer"],
      ["service", "Service"],
      ["origin", "Origin"],
      ["destination", "Destination"],
      ["date", "Travel date"],
      ["passengerCount", "Passengers"],
      ["payment", "Payment"],
      ["status", "Handover"],
      ["coordinator", "Coordinator"],
    ],
    statuses: ["Awaiting Review", "Under Review", "Accepted", "Clarification Required", "On Hold"],
    filters: ["service", "coordinator"],
  },
  operators: {
    kind: "operators",
    description: "Coordinate with approved partners. Account approval stays with Admin.",
    columns: [
      ["name", "Operator"],
      ["contact", "Contact"],
      ["email", "Email"],
      ["mobile", "Mobile"],
      ["service", "Service"],
      ["fleetSize", "Fleet"],
      ["assignedCount", "Assigned flights"],
      ["availability", "Availability"],
      ["status", "Verification"],
    ],
    statuses: ["Verified · demo"],
    filters: ["service"],
  },
  aircraft: {
    kind: "aircraft",
    description: "One fleet directory, with assignment and maintenance visibility.",
    columns: [
      ["id", "Aircraft ID"],
      ["registration", "Registration"],
      ["type", "Type"],
      ["manufacturer", "Manufacturer"],
      ["model", "Model"],
      ["operator", "Operator"],
      ["capacity", "Seats"],
      ["payload", "Payload"],
      ["status", "Availability"],
      ["maintenance", "Maintenance"],
      ["nextFlight", "Next flight"],
    ],
    statuses: ["Available", "Assigned", "In Flight", "Maintenance", "Unavailable"],
    filters: ["operator", "type"],
  },
  crew: {
    kind: "crew",
    description: "People, qualifications and proposed assignments. Evidence requires review.",
    columns: [
      ["id", "Crew ID"],
      ["name", "Name"],
      ["role", "Role"],
      ["operator", "Operator"],
      ["licence", "Licence"],
      ["licenceExpiry", "Licence expiry"],
      ["medicalExpiry", "Medical expiry"],
      ["availability", "Availability"],
      ["flight", "Assigned flight"],
      ["status", "Status"],
    ],
    statuses: ["Available", "Review Required", "Proposed"],
    filters: ["operator", "role"],
  },
  passengers: {
    kind: "passengers",
    description: "A protected view of fictional manifests and passenger coordination.",
    columns: [
      ["name", "Passenger"],
      ["booking", "PNR"],
      ["relatedFlights", "Flights"],
      ["nationality", "Nationality"],
      ["type", "Type"],
      ["identity", "ID evidence"],
      ["medical", "Medical document"],
      ["declaredWeight", "Declared kg"],
      ["status", "Check-in"],
    ],
    statuses: ["Pending", "Under Review", "Cleared", "Blocked"],
    filters: ["booking", "identity"],
  },
  "landing-sites": {
    kind: "sites",
    description: "Site availability is separate from permissions and legal approval.",
    columns: [
      ["name", "Site"],
      ["type", "Type"],
      ["city", "Location"],
      ["coordinates", "Coordinates"],
      ["owner", "Owner"],
      ["permission", "Permission"],
      ["security", "Security"],
      ["fireCover", "Fire cover"],
      ["status", "Availability"],
    ],
    statuses: ["Available", "Restricted"],
    filters: ["type", "permission"],
  },
  "ground-handling": {
    kind: "tasks",
    description: "Coordinate every detail from pickup to final boarding.",
    columns: [
      ["id", "Task ID"],
      ["name", "Task"],
      ["flight", "Flight"],
      ["staff", "Assigned staff"],
      ["due", "Due time"],
      ["priority", "Priority"],
      ["status", "Status"],
      ["notes", "Notes"],
    ],
    statuses: ["Pending", "Assigned", "In Progress", "Completed", "Blocked"],
    filters: ["priority", "staff"],
  },
  compliance: {
    kind: "compliance",
    description: "Evidence and exception tracking, using configurable demo requirements.",
    columns: [
      ["flight", "Flight"],
      ["name", "Requirement"],
      ["category", "Category"],
      ["responsible", "Responsible party"],
      ["due", "Due"],
      ["status", "Status"],
      ["severity", "Severity"],
    ],
    statuses: [
      "Pending",
      "Evidence Submitted",
      "Verified",
      "Expired",
      "Exception Open",
      "Escalated",
    ],
    filters: ["category", "severity"],
  },
  incidents: {
    kind: "incidents",
    description: "Record coordination details and maintain a clear review trail.",
    columns: [
      ["id", "Reference"],
      ["flight", "Flight"],
      ["name", "Summary"],
      ["category", "Category"],
      ["severity", "Severity"],
      ["reported", "Reported"],
      ["reviewer", "Reviewer"],
      ["escalation", "Escalation"],
      ["status", "Status"],
    ],
    statuses: ["Open", "Under Review", "Escalated", "Closed"],
    filters: ["severity", "reviewer"],
  },
  hems: {
    kind: "hems",
    description: "Medical transport coordination. No clinical decisions or patient diagnoses.",
    columns: [
      ["flight", "Flight"],
      ["patient", "Patient reference"],
      ["origin", "Origin"],
      ["destination", "Destination"],
      ["aircraft", "Aircraft"],
      ["medicalCrew", "Medical crew"],
      ["equipment", "Equipment"],
      ["ambulance", "Ground transfer"],
      ["status", "Coordination"],
    ],
    statuses: ["Pending", "Coordinating", "Completed", "Blocked"],
    filters: ["equipment", "ambulance"],
  },
  documents: {
    kind: "documents",
    description:
      "Fictional evidence library. Uploads store filenames locally, never file contents.",
    columns: [
      ["name", "Document"],
      ["category", "Category"],
      ["flight", "Flight"],
      ["uploadedBy", "Uploaded by"],
      ["uploaded", "Uploaded"],
      ["expiry", "Expiry"],
      ["status", "Review"],
    ],
    statuses: ["Pending", "Evidence Submitted", "Verified", "Expired"],
    filters: ["category", "flight"],
  },
  notifications: {
    kind: "notifications",
    description: "The operational updates that deserve your attention.",
    columns: [
      ["name", "Notification"],
      ["flight", "Related flight"],
      ["timestamp", "Time"],
      ["status", "Read status"],
    ],
    statuses: ["Unread", "Read"],
    filters: ["type"],
  },
};
export const fieldLabels: Record<string, string> = {
  maskedId: "Masked identity",
  nextOfKin: "Next of kin",
  bodyWeight: "Measured body weight (kg)",
  baggageWeight: "Measured hand baggage (kg)",
  aoc: "AOC reference",
  actualDeparture: "Actual departure",
  actualArrival: "Actual arrival",
  site: "Landing site",
  pic: "Pilot-in-command",
  atc: "ATC notification",
  fireCover: "Fire cover",
  licenceExpiry: "Licence expiry",
  medicalExpiry: "Medical expiry",
  aircraft: "Aircraft",
  booking: "Booking PNR",
  flight: "Flight",
  operator: "Operator",
};
export function fieldTitle(key: string) {
  return fieldLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
export {
  assignmentStatuses,
  flightStatuses,
  checkStatuses,
  complianceCategories,
  preparationSections,
};

export const operatorNavigation = [
  { group: "Overview", items: [["dashboard", "Dashboard", LayoutDashboard]] },
  {
    group: "Commercial",
    items: [
      ["requests", "Charter Requests", Contact],
      ["quotes", "Quotations", Files],
      ["bookings", "Bookings", ClipboardCheck],
    ],
  },
  {
    group: "Fleet Management",
    items: [
      ["aircraft", "My Aircraft", Plane],
      ["availability", "Availability Calendar", CalendarDays],
      ["crew", "Pilots & Crew", Users],
    ],
  },
  {
    group: "Flight Operations",
    items: [
      ["schedule", "Flight Schedule", CalendarDays],
      ["preparation", "Flight Preparation", ListChecks],
      ["passengers", "Passenger Manifest", Contact],
      ["ground", "Ground Coordination", Truck],
      ["flights", "Flight Updates", Radar],
    ],
  },
  {
    group: "Safety & Compliance",
    items: [
      ["compliance", "Compliance & Documents", ShieldCheck],
      ["incidents", "Incidents & Diversions", TriangleAlert],
    ],
  },
  {
    group: "Communication & Management",
    items: [
      ["messages", "Messages", Contact],
      ["reports", "Reports", ChartNoAxesCombined],
      ["notifications", "Notifications", Bell],
      ["profile", "Company Profile", Building2],
    ],
  },
] as const satisfies readonly {
  group: string;
  items: readonly (readonly [string, string, LucideIcon])[];
}[];
export const operatorPages = operatorNavigation.flatMap((g) =>
  g.items.map(([key, title, icon]) => ({ key, title, icon, group: g.group })),
);
export const operatorSchemas: Record<string, Schema> = {
  ...schemas,
  requests: {
    kind: "requests",
    description: "Enquiries sent to your company by Viman. Client contacts remain private.",
    columns: [
      ["name", "Request"],
      ["client", "Client ref"],
      ["type", "Aircraft type"],
      ["route", "Route"],
      ["date", "Departure"],
      ["passengers", "Passengers"],
      ["requirements", "Requirements"],
      ["requested", "Received"],
      ["deadline", "Respond by"],
      ["status", "Status"],
    ],
    statuses: [
      "New",
      "Under Review",
      "Availability Confirmed",
      "Quote Submitted",
      "Declined",
      "Expired",
    ],
    filters: ["type"],
  },
  quotes: {
    kind: "quotes",
    description: "Your cost quotations to Viman. No customer retail pricing is shown.",
    columns: [
      ["name", "Quote"],
      ["request", "Request"],
      ["route", "Route"],
      ["aircraft", "Aircraft"],
      ["date", "Flight date"],
      ["total", "Proposed amount"],
      ["currency", "Currency"],
      ["validUntil", "Valid until"],
      ["status", "Status"],
    ],
    statuses: [
      "Draft",
      "Submitted",
      "Under Review",
      "Revision Requested",
      "Approved",
      "Rejected",
      "Expired",
    ],
    filters: ["aircraft", "currency"],
  },
  bookings: {
    kind: "bookings",
    description:
      "Confirmed bookings assigned to your company. Commercial records remain with Viman.",
    columns: [
      ["name", "PNR"],
      ["relatedFlights", "Flight legs"],
      ["route", "Route"],
      ["date", "Departure"],
      ["passengerCount", "Passengers"],
      ["aircraft", "Aircraft (first leg)"],
      ["assignment", "Assignment"],
      ["flightStatus", "Flight status"],
      ["status", "Handover status"],
    ],
    statuses: schemas["bookings"]!.statuses,
    filters: ["service"],
  },
  ground: schemas["ground-handling"]!,
};
