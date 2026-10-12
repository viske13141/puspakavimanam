import {
  DEMO_DATE,
  assignmentStatuses,
  checkStatuses,
  complianceCategories,
  dateOffset,
  flightStatuses,
  kinds,
  preparationSections,
  type Database,
  type Entry,
  type Fields,
  type Kind,
} from "./model";
const item = (id: string, name: string, status: string, fields: Fields): Entry => ({
  id,
  name,
  status,
  fields,
  history: [
    "Demo record created · 09 Oct 2026, 16:00 IST",
    "Imported into fictional operations review workspace",
  ],
});
const pick = <T>(values: readonly T[], i: number): T => values[i % values.length]!;
const id = (prefix: string, n: number) => `${prefix}-${String(n + 1).padStart(3, "0")}`;
export function createDemoData(): Database {
  const data = Object.fromEntries(kinds.map((k) => [k, []])) as unknown as Database;
  const names = [
    "Arin Mehra",
    "Mira Shah",
    "Dev Kapoor",
    "Ira Sen",
    "Rohan Das",
    "Tara Rao",
    "Kabir Jain",
    "Anya Bose",
  ];
  const cities = [
    "Mumbai",
    "Pune",
    "Bengaluru",
    "Mysuru",
    "Goa",
    "Hyderabad",
    "Chennai",
    "Coimbatore",
    "Jaipur",
    "Udaipur",
  ];
  data.operators = [
    "Aster Air",
    "Meridian Rotor",
    "Cobalt Aviation",
    "Saffron Wings",
    "Northstar Charter",
    "Horizon Aero",
  ].map((name, i) =>
    item(id("OP", i), name, "Verified · demo", {
      contact: pick(names, i),
      email: `dispatch${i + 1}@example.com`,
      mobile: "+91 00000 00000",
      service: i % 2 ? "Helicopter" : "Private Jet",
      availability: "Available",
      aoc: `DEMO-AOC-${i + 1}`,
      licence: `DEMO-LIC-${i + 1}`,
      address: `${pick(cities, i)} · Fictional office`,
      fleetSize: String(2 + i),
      assignedCount: String(i % 3),
      notes: "Coordination contact only; account management remains with Admin.",
    }),
  );
  data.aircraft = Array.from({ length: 12 }, (_, i) =>
    item(
      id("AC", i),
      `DEMO-${String(i + 1).padStart(2, "0")} · ${pick(["H145", "Bell 429", "Citation XLS+", "AW139"], i)}`,
      pick(["Available", "Assigned", "In Flight", "Maintenance", "Unavailable"], i),
      {
        registration: `DEMO-${String(i + 1).padStart(2, "0")}`,
        type: i % 4 === 2 ? "Private Jet" : "Helicopter",
        manufacturer: pick(["Airbus", "Bell", "Cessna", "Leonardo"], i),
        model: pick(["H145", "429", "Citation XLS+", "AW139"], i),
        operator: id("OP", i % 6),
        capacity: String(i % 4 === 2 ? 8 : 6),
        payload: "Refer to approved configuration",
        maintenance: i % 5 === 3 ? "Maintenance block" : "No scheduled block",
        blockDate: DEMO_DATE,
        blockStart: "12:00",
        blockEnd: "15:00",
        notes: "Fictional fleet specifications. Not a performance or dispatch reference.",
      },
    ),
  );
  data.bookings = Array.from({ length: 20 }, (_, i) =>
    item(
      id("BK", i),
      `VM${26001 + i}`,
      pick(["Awaiting Review", "Under Review", "Accepted", "Clarification Required", "On Hold"], i),
      {
        customer: pick(names, i),
        email: `customer${i + 1}@example.com`,
        mobile: "+91 ••••• ••100",
        service: i % 4 === 2 ? "Private Jet" : "Helicopter",
        origin: pick(cities, i),
        destination: pick(cities, i + 1),
        date: dateOffset(DEMO_DATE, i < 10 ? 0 : i % 5),
        payment: "Confirmed · read-only",
        coordinator: pick(["Mira Shah", "Arin Mehra", "Tara Rao"], i),
        priority: i % 4 ? "Normal" : "High",
        passengerCount: String(1 + (i % 5)),
        requests: i % 3 ? "Standard baggage assistance" : "Step-free ground transport requested",
        salesNotes: "Confirmed itinerary handed over for operational coordination.",
        notes: "Review manifest and landing site permissions.",
        checklist: "",
      },
    ),
  );
  data.flights = Array.from({ length: 15 }, (_, i) => {
    const aircraft = data.aircraft[i % 12]!;
    const booking = data.bookings[i]!;
    const hour = 7 + (i % 9);
    return item(id("FL", i), `VM-${410 + i}`, pick(flightStatuses, i), {
      booking: booking.id,
      operator: i % 5 === 0 ? "" : aircraft.fields["operator"]!,
      aircraft: i % 5 === 0 ? "" : aircraft.id,
      date: booking.fields["date"]!,
      departure: `${String(hour).padStart(2, "0")}:30`,
      arrival: `${String(hour + 1).padStart(2, "0")}:40`,
      duration: "70",
      assignment: i % 5 === 0 ? "Unassigned" : pick(assignmentStatuses.slice(1), i),
      readiness: i % 4 === 0 ? "Blocked" : i % 3 === 0 ? "Ready" : "In Progress",
      site: id("SITE", (i + 1) % 10),
      crew: id("CREW", i % 20),
      actualDeparture: i % 11 >= 4 && i % 11 <= 7 ? `${hour}:35` : "",
      actualArrival: i % 11 >= 6 && i % 11 <= 7 ? `${hour + 1}:45` : "",
      lastUpdate: "10:20 IST · demo",
      reason: i % 11 === 8 ? "Ground transport delay" : "",
      coordinator: booking.fields["coordinator"]!,
      priority: "Normal",
      confirmation: "Awaiting response",
      notes: "Illustrative flight movement; no telemetry connected.",
    });
  });
  data.crew = Array.from({ length: 20 }, (_, i) =>
    item(
      id("CREW", i),
      `${pick(names, i)} ${String.fromCharCode(65 + Math.floor(i / 8))}.`,
      i % 7 === 0 ? "Review Required" : "Available",
      {
        role: pick(
          ["Pilot-in-Command", "Co-Pilot", "Cabin Crew", "Medical Crew", "Ground Crew"],
          i,
        ),
        operator: id("OP", i % 6),
        licence: `DEMO-CPL-${1000 + i}`,
        licenceExpiry: i % 7 === 0 ? "2026-09-30" : "2027-09-30",
        medicalExpiry: i % 9 === 0 ? "2026-10-01" : "2027-04-01",
        flight: id("FL", i % 15),
        qualifications: "Fictional type rating; operator verification required",
        availability: "Subject to duty/rest review",
        documents: "Evidence review required; upload is not proof of validity",
      },
    ),
  );
  data.passengers = Array.from({ length: 40 }, (_, i) =>
    item(
      id("PAX", i),
      `${pick(names, i)} ${i + 1}`,
      pick(["Pending", "Under Review", "Cleared", "Blocked"], i),
      {
        booking: id("BK", i % 20),
        nationality: "Indian",
        type: i % 9 ? "Adult" : "Child",
        identity: i % 4 ? "Evidence received" : "Review Required",
        maskedId: `•••• •••• ${1200 + i}`,
        passport: "Masked · ••••4021",
        visa: "Not applicable for demo itinerary",
        emergency: "+91 ••••• ••200",
        nextOfKin: "Contact held privately · demo",
        medical: i % 6 ? "Not required for demo scenario" : "Awaiting Evidence",
        declaredWeight: String(50 + (i % 35)),
        bodyWeight: i % 4 === 2 ? "68" : "",
        baggageWeight: i % 4 === 2 ? "4" : "",
        checklist: i % 4 === 2 ? "0,1,2,3,4,5,6" : "",
        notes: "Fictional passenger. Do not enter real personal information.",
      },
    ),
  );
  data.sites = cities.map((name, i) =>
    item(
      id("SITE", i),
      `${name} ${i % 2 ? "Helipad" : "Air Terminal"}`,
      i % 3 ? "Available" : "Restricted",
      {
        type: pick(
          ["Airport", "Helipad", "Private Helipad", "Temporary Landing Site", "Helideck"],
          i,
        ),
        city: name,
        coordinates: `${(18 + i * 0.4).toFixed(3)}, ${(72 + i * 0.3).toFixed(3)} · illustrative`,
        owner: `Demo Site Services ${i + 1}`,
        contact: "site@example.com",
        permission: i % 3 ? "Evidence submitted" : "Pending",
        security: i % 4 ? "Coordinated" : "Pending",
        fireCover: i % 3 ? "Evidence submitted" : "Pending",
        restrictions: "Availability does not establish legal approval. Verify operator procedures.",
        handling: "Ground team on request",
        notes: "Review landing permissions before operational planning.",
      },
    ),
  );
  const taskTypes = [
    "Passenger Pickup",
    "Ground Transport",
    "Catering",
    "Baggage Handling",
    "Boarding Assistance",
    "Security Coordination",
    "Medical Assistance",
    "Landing Site Coordination",
  ];
  data.tasks = Array.from({ length: 25 }, (_, i) =>
    item(
      id("TASK", i),
      pick(taskTypes, i),
      pick(["Pending", "Assigned", "In Progress", "Completed", "Blocked"], i),
      {
        flight: id("FL", i % 15),
        type: pick(taskTypes, i),
        staff: pick(names, i),
        due: `${DEMO_DATE}T${String(8 + (i % 10)).padStart(2, "0")}:15`,
        priority: i % 4 ? "Normal" : "High",
        notes: "Coordinate with local handling contact.",
      },
    ),
  );
  data.checks = data.flights.flatMap((flight, f) =>
    preparationSections.map((name, i) =>
      item(`CHECK-${f}-${i}`, name, pick(checkStatuses, i + f), {
        flight: flight.id,
        responsible: pick(names, i),
        updated: "09 Oct 2026 · demo",
        notes: "Coordination evidence only. Pilot-in-command retains operational authority.",
        document: id("DOC", i % 24),
      }),
    ),
  );
  data.compliance = Array.from({ length: 30 }, (_, i) =>
    item(
      id("COMP", i),
      `${pick(complianceCategories, i)} review`,
      pick(["Pending", "Evidence Submitted", "Verified", "Expired", "Exception Open"], i),
      {
        flight: id("FL", i % 15),
        category: pick(complianceCategories, i),
        responsible: pick(names, i),
        due: DEMO_DATE,
        severity: pick(["Low", "Medium", "High", "Critical"], i),
        reviewer: "Mira Shah",
        evidence: id("DOC", i % 24),
        notes:
          "Configurable demo requirement. Refer to approved operator checklists; no universal legal threshold is assumed.",
      },
    ),
  );
  data.incidents = Array.from({ length: 10 }, (_, i) =>
    item(
      id("INC", i),
      i < 5 ? `Diversion review ${i + 1}` : `Ground incident ${i - 4}`,
      i % 3 ? "Under Review" : "Open",
      {
        type: i < 5 ? "Diversion" : "Incident",
        flight: id("FL", i % 15),
        originalDestination: pick(cities, i + 1),
        revisedDestination: pick(cities, i + 2),
        reason: "Fictional weather / ground coordination scenario",
        reported: `${DEMO_DATE}T09:15`,
        pic: pick(names, i),
        atc: "Not recorded",
        dispatch: "Demo notification recorded",
        care: "Ground transport coordination",
        permission: "Pending review",
        category: "Ground Operations",
        severity: pick(["Low", "Medium", "High"], i),
        reporter: pick(names, i),
        reviewer: "Mira Shah",
        escalation: "Pending review",
        notes: "Training scenario only; not a submitted regulatory report.",
      },
    ),
  );
  data.hems = Array.from({ length: 4 }, (_, i) =>
    item(id("HEMS", i), `Transfer •••${201 + i}`, i % 3 ? "Coordinating" : "Completed", {
      flight: id("FL", i),
      patient: `PT-•••${201 + i}`,
      origin: pick(cities, i),
      destination: pick(cities, i + 3),
      aircraft: data.aircraft[i % 12]!.id,
      medicalCrew: "Demo clinical transfer team",
      equipment: i % 2 ? "Check Pending" : "Evidence Submitted",
      ambulance: i % 2 ? "Coordinated" : "Pending",
      oxygen: "Operator review pending",
      destinationFacility: "Demo receiving facility · facility@example.com",
      documents: "Transfer coordination form · pending review",
      requirements: "Stretcher handling and equipment coordination only",
      notes: "No clinical details or medical clearance decisions are held here.",
    }),
  );
  const docCategories = [
    "Passenger Documents",
    "Crew Documents",
    "Aircraft Documents",
    "Flight Manifests",
    "Weight & Balance Records",
    "Landing Permissions",
    "Journey Logs",
    "Incident Documents",
    "Medical Transport Documents",
  ];
  data.documents = Array.from({ length: 24 }, (_, i) =>
    item(
      id("DOC", i),
      `${pick(docCategories, i)} · sample ${i + 1}`,
      pick(["Pending", "Evidence Submitted", "Verified", "Expired"], i),
      {
        category: pick(docCategories, i),
        flight: id("FL", i % 15),
        uploadedBy: pick(names, i),
        uploaded: "2026-10-09",
        expiry: i % 4 === 3 ? "2026-10-01" : "2027-03-01",
        content:
          "FICTIONAL SAMPLE — NOT VALID FOR FLIGHT OPERATIONS. This preview contains no real identity, licence or aircraft data.",
      },
    ),
  );
  const notificationTypes = [
    "New Booking Handover",
    "Operator Assignment Response",
    "Upcoming Departure",
    "Missing Document",
    "Compliance Warning",
    "Flight Delay",
    "Diversion Alert",
    "Crew Assignment Update",
    "Ground Handling Update",
  ];
  data.notifications = Array.from({ length: 20 }, (_, i) =>
    item(id("NTF", i), pick(notificationTypes, i), i % 3 ? "Unread" : "Read", {
      type: pick(notificationTypes, i),
      flight: id("FL", i % 15),
      timestamp: `${DEMO_DATE} ${String(8 + (i % 3)).padStart(2, "0")}:${String((i * 3) % 60).padStart(2, "0")} IST`,
      notes: "A fictional operational record needs your attention.",
    }),
  );
  data.profile = [
    item("PROFILE", "Mira Shah", "Active", {
      email: "operations@example.com",
      mobile: "+91 00000 00000",
      department: "Flight Operations",
      designation: "Operations Coordinator",
      role: "OPERATIONS",
      created: "2026-09-20",
      notes: "UI-only profile. Login identity is unchanged.",
    }),
  ];
  return data;
}

export function createOperatorData(): Database {
  const data = createDemoData();
  data.operators = data.operators.slice(0, 4);
  data.aircraft = data.aircraft.map((a, i) => ({
    ...a,
    fields: {
      ...a.fields,
      operator: id("OP", i % 4),
      base: pick(["Mumbai", "Pune", "Goa", "Bengaluru"], i),
    },
  }));
  data.bookings = data.bookings.slice(0, 18).map((b) => ({
    ...b,
    fields: {
      ...b.fields,
      customer: "Client " + b.name,
      email: "Not shared",
      mobile: "Not shared",
      payment: "Managed by Viman",
    },
  }));
  data.flights = Array.from({ length: 25 }, (_, i) => {
    const original = data.flights[i % 15]!;
    const bookIndex = i % 18;
    const company = bookIndex % 4;
    const aircraft = data.aircraft[company + 4 * (Math.floor(i / 4) % 3)]!;
    return {
      ...original,
      id: id("FL", i),
      name: `VM-${510 + i}`,
      fields: {
        ...original.fields,
        booking: id("BK", bookIndex),
        operator: id("OP", company),
        aircraft: aircraft.id,
        crew: id("CREW", company),
        assignment: "Accepted",
        date: dateOffset(DEMO_DATE, Math.floor(i / 8)),
        departure: `${String(7 + (i % 10)).padStart(2, "0")}:30`,
        arrival: `${String(8 + (i % 10)).padStart(2, "0")}:40`,
      },
    };
  });
  data.crew = Array.from({ length: 24 }, (_, i) => {
    const old = data.crew[i % 20]!;
    const flight = data.flights.find((f) => f.fields["operator"] === id("OP", i % 4))!;
    return {
      ...old,
      id: id("CREW", i),
      name: `${old.name} ${i + 1}`,
      fields: { ...old.fields, operator: id("OP", i % 4), flight: flight.id },
    };
  });
  data.passengers = data.passengers.map((p, i) => ({
    ...p,
    fields: { ...p.fields, booking: id("BK", i % 18) },
  }));
  const operatorChecks = [
    "Aircraft Assignment Confirmed",
    "Aircraft Documents Reviewed",
    "Crew Assignment Confirmed",
    "Crew Licence and Medical Records Reviewed",
    "Passenger Manifest Reviewed",
    "Weight and Balance Documentation",
    "Weather Information Reviewed",
    "NOTAM Information Reviewed",
    "Landing Permissions",
    "Ground Handling Coordination",
    "Fuel Planning Documentation",
    "Emergency Equipment",
    "Passenger Safety Briefing Arrangements",
    "Catering and Additional Load",
    "Operator Operational Review",
  ];
  data.checks = data.flights.flatMap((flight, f) =>
    operatorChecks.map((name, i) =>
      item(`OPCHECK-${f}-${i}`, name, pick(checkStatuses, i + f), {
        flight: flight.id,
        responsible: "Demo duty coordinator",
        updated: "09 Oct 2026 · demo",
        evidence: id("DOC", f % 30),
        notes: "Preparation tracking only; not flight release.",
      }),
    ),
  );
  data.requests = Array.from({ length: 20 }, (_, i) =>
    item(
      id("REQ", i),
      `VREQ-${700 + i}`,
      pick(
        ["New", "Under Review", "Availability Confirmed", "Quote Submitted", "Declined", "Expired"],
        i,
      ),
      {
        operator: id("OP", i % 4),
        client: `CLIENT-${100 + i}`,
        type: i % 2 ? "Helicopter" : "Private Jet",
        origin: pick(["Mumbai", "Pune", "Goa", "Bengaluru"], i),
        destination: pick(["Udaipur", "Mysuru", "Chennai", "Jaipur"], i),
        date: dateOffset(DEMO_DATE, 2 + (i % 5)),
        passengers: String(2 + (i % 4)),
        requirements: "Baggage assistance requested",
        requested: "2026-10-09",
        deadline: "2026-10-12T18:00",
        notes: "Explicitly sent to this mock company by Viman.",
      },
    ),
  );
  data.quotes = Array.from({ length: 15 }, (_, i) => {
    const request = data.requests[i]!;
    return item(
      id("QUOTE", i),
      `VQ-${900 + i}`,
      pick(
        [
          "Draft",
          "Submitted",
          "Under Review",
          "Revision Requested",
          "Approved",
          "Rejected",
          "Expired",
        ],
        i,
      ),
      {
        operator: request.fields["operator"]!,
        request: request.id,
        aircraft: id("AC", i % 4),
        origin: request.fields["origin"]!,
        destination: request.fields["destination"]!,
        date: request.fields["date"]!,
        hourlyRate: "85000",
        hours: "1.5",
        positioning: "12000",
        landing: "5000",
        handling: "3000",
        other: "0",
        tax: "5",
        currency: "INR",
        validUntil: "2026-10-15",
        terms: "Subject to aircraft availability and operator review",
        notes: "Operator cost quotation for Viman only.",
      },
    );
  });
  data.blocks = data.aircraft
    .filter((_, i) => i % 3 === 0)
    .map((a, i) =>
      item(id("BLOCK", i), "Scheduled maintenance", "Maintenance", {
        operator: a.fields["operator"]!,
        aircraft: a.id,
        start: `${DEMO_DATE}T12:00`,
        end: `${DEMO_DATE}T15:00`,
        reason: "Fictional scheduled inspection",
        notes: "Availability block simulation",
      }),
    );
  data.tasks = data.tasks.slice(0, 20);
  data.documents = Array.from({ length: 30 }, (_, i) => {
    const old = data.documents[i % 24]!;
    return {
      ...old,
      id: id("DOC", i),
      fields: { ...old.fields, flight: id("FL", i % 25), issued: "2026-09-01" },
    };
  });
  data.messages = Array.from({ length: 15 }, (_, i) =>
    item(
      id("MSG", i),
      pick(
        [
          "Charter Request",
          "Quote Clarification",
          "Flight Assignment",
          "Schedule Change",
          "Compliance Issue",
          "Ground Coordination",
          "General Operations",
        ],
        i,
      ),
      i % 3 ? "Unread" : "Read",
      {
        operator: id("OP", i % 4),
        flight: data.flights.find((f) => f.fields["operator"] === id("OP", i % 4))!.id,
        category: pick(
          [
            "Charter Request",
            "Quote Clarification",
            "Flight Assignment",
            "Schedule Change",
            "Compliance Issue",
            "Ground Coordination",
            "General Operations",
          ],
          i,
        ),
        timestamp: "10 Oct · 09:30 IST",
        messages: JSON.stringify([
          {
            sender: "Viman Operations",
            text: "Please review the fictional flight coordination details and confirm availability.",
            time: "09:30 IST",
          },
        ]),
        attachment: i % 3 ? "" : "demo-briefing.txt",
      },
    ),
  );
  data.notifications = Array.from({ length: 25 }, (_, i) =>
    item(
      id("NTF", i),
      pick(
        [
          "New Charter Request",
          "Quote Revision Requested",
          "Assignment Received",
          "Assignment Updated",
          "Upcoming Flight",
          "Crew Document Expiry",
          "Aircraft Maintenance Reminder",
          "Compliance Warning",
          "Schedule Change",
          "Operations Message",
        ],
        i,
      ),
      i % 3 ? "Unread" : "Read",
      {
        type: pick(
          [
            "New Charter Request",
            "Quote Revision Requested",
            "Assignment Received",
            "Assignment Updated",
            "Upcoming Flight",
            "Crew Document Expiry",
            "Aircraft Maintenance Reminder",
            "Compliance Warning",
            "Schedule Change",
            "Operations Message",
          ],
          i,
        ),
        flight: id("FL", i % 25),
        timestamp: "10 Oct · 10:15 IST",
        notes: "A fictional company record needs attention.",
      },
    ),
  );
  data.incidents = data.incidents.slice(0, 8);
  data.profile = data.operators.map((o) =>
    item(`PROFILE-${o.id}`, o.name, "Active", {
      ...o.fields,
      operator: o.id,
      verification: "Verified · demo",
      registered: "2026-09-20",
      role: "OPERATOR",
      notes: "Company details managed by Admin; contact edits are local demos.",
    }),
  );
  return data;
}
