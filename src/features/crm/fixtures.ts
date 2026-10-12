import { type CrmData, type CrmLead, sources, stages, services } from "./model";
const id = (kind: number, i: number) =>
  `c0000000-0000-4000-a${String(kind).padStart(3, "0")}-${String(i + 1).padStart(12, "0")}`;
const date = (day: number, hour = 10) => new Date(Date.UTC(2026, 8, day, hour)).toISOString();
const names = [
  "Aarav Mehta",
  "Ananya Sharma",
  "Rohan Kapoor",
  "Priya Nair",
  "Vikram Shah",
  "Ishita Rao",
  "Arjun Reddy",
  "Neha Malhotra",
  "Kabir Sethi",
  "Sana Khan",
  "Aditya Joshi",
  "Diya Patel",
  "Karan Bhatia",
  "Meera Iyer",
  "Rishabh Jain",
  "Aditi Desai",
  "Dev Verma",
  "Tara Singh",
  "Rahul Menon",
  "Nisha Gupta",
];
const cities = [
  "Mumbai (BOM)",
  "Delhi (DEL)",
  "Bengaluru (BLR)",
  "Hyderabad (HYD)",
  "Goa (GOX)",
  "Jaipur (JAI)",
];
const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;
export function createFixtures(): CrmData {
  const team = Array.from({ length: 10 }, (_, i) => ({
    id: id(1, i),
    createdAt: date(1),
    name: pick(
      [
        "Aisha Kapoor",
        "Rahul Sharma",
        "Sneha Patel",
        "Aditya Rao",
        "Nandini Shah",
        "Kunal Mehta",
        "Riya Nair",
        "Dev Singh",
        "Anika Joshi",
        "Varun Reddy",
      ],
      i,
    ),
    email: `sales${i + 1}@viman.example`,
    service: pick(services, i),
    region: pick(cities, i),
  }));
  const campaigns = Array.from({ length: 12 }, (_, i) => ({
    id: id(2, i),
    createdAt: date(1),
    name:
      pick(
        [
          "Festive escapes",
          "Business without boundaries",
          "Wedding arrivals",
          "Weekend above it all",
          "VIP airport transfers",
          "Private skies",
        ],
        i,
      ) + ` · ${i + 1}`,
    platform: pick(sources, i),
    status: pick(["Active", "Active", "Paused", "Completed"], i),
    startDate: date(1),
    endDate: date(61),
    budget: 150000 + i * 20000,
    spend: 42000 + i * 6700,
    service: pick(services, i),
    region: pick(cities, i),
    description: "Sample campaign for premium aviation enquiries.",
    type: "Lead generation",
  }));
  const customers = Array.from({ length: 30 }, (_, i) => ({
    id: id(3, i),
    createdAt: date(1 + (i % 20)),
    name: pick(names, i) + (i >= 20 ? " " + String(i) : ""),
    email: `customer${i + 1}@example.com`,
    mobile: `+91900000${String(i + 1).padStart(4, "0")}`,
    company: pick(
      ["Meridian Group", "Independent", "Aster Ventures", "Crest Hospitality", "Apex Industries"],
      i,
    ),
    type: pick(["Corporate", "Individual", "VIP", "Repeat"], i),
    ownerId: team[i % 10]!.id,
    status: "Active",
  }));
  const leads: CrmLead[] = Array.from({ length: 108 }, (_, i) => {
    const c = customers[i % 30]!;
    const campaign = campaigns[i % 12]!;
    return {
      id: id(4, i),
      createdAt: date(3 + (i % 40)),
      name: i < 30 ? c.name : pick(names, i) + ` ${Math.floor(i / 20) + 1}`,
      email: i < 30 ? c.email : `enquiry${i + 1}@example.com`,
      mobile: i < 30 ? c.mobile : `+91910000${String(i + 1).padStart(4, "0")}`,
      company: c.company,
      city: pick(cities, i).split(" (")[0]!,
      service: pick(services, i),
      source: campaign.platform,
      sourceHistory: [campaign.platform],
      campaignId: campaign.id,
      customerId: i < 45 ? c.id : "",
      ownerId: i % 9 === 0 ? "" : team[i % 10]!.id,
      status: pick(["New", "Contacted", "Qualified", "Qualified", "New", "Unqualified"], i),
      priority: pick(["High", "Medium", "Low"], i),
      value: 180000 + (i % 13) * 125000,
      departure: pick(cities, i),
      destination: pick(cities, i + 2),
      travelDate: date(48 + (i % 28)),
      passengers: 2 + (i % 7),
      tripType: pick(["One way", "Round trip"], i),
      notes: pick(
        [
          "Prefers a morning departure.",
          "Corporate travel; flexible dates.",
          "Please include ground transfers.",
        ],
        i,
      ),
      nextFollowup: date(39 + (i % 10)),
      responseMinutes: 15 + (i % 12) * 8,
      externalId: `EXT-${1000 + i}`,
      importStatus: i % 17 === 0 ? "Failed" : i % 13 === 0 ? "Pending" : "Imported",
      consent: "Sample consent: enquiry form contact permission",
    };
  });
  for (let i = 0; i < 3; i++) {
    leads[105 + i]!.email = leads[i]!.email;
    leads[105 + i]!.mobile = leads[i]!.mobile;
    leads[105 + i]!.name = leads[i]!.name;
  }
  const opportunities = Array.from({ length: 42 }, (_, i) => ({
    id: id(5, i),
    createdAt: leads[i]!.createdAt,
    name: `${leads[i]!.name} · ${leads[i]!.service}`,
    leadId: leads[i]!.id,
    ownerId: leads[i]!.ownerId,
    stage: i < 15 ? "Booked" : pick(stages.slice(0, 5), i),
    value: leads[i]!.value,
    lossReason: "",
  }));
  const quotations = Array.from({ length: 24 }, (_, i) => {
    const o = opportunities[i]!;
    const l = leads[i]!;
    return {
      id: id(6, i),
      createdAt: l.createdAt,
      name: `VQ-2026-${1001 + i}`,
      customerId: l.customerId,
      opportunityId: o.id,
      leadId: l.id,
      service: l.service,
      items: [
        { description: `${l.service} charter`, quantity: 1, unitPrice: Math.round(o.value / 1.18) },
      ],
      tax: 18,
      discount: 0,
      currency: "INR",
      validUntil: date(52 + i),
      terms: "Subject to aircraft availability and weather clearance.",
      notes: "Local quotation preview only.",
      status:
        i < 15
          ? "Accepted"
          : pick(["Draft", "Pending Approval", "Sent", "Viewed", "Rejected", "Expired"], i),
      ownerId: l.ownerId,
    };
  });
  const enquiries = Array.from({ length: 45 }, (_, i) => {
    const l = leads[i]!;
    return {
      id: id(7, i),
      createdAt: l.createdAt,
      name: `REQ-2026-${2001 + i}`,
      customerId: l.customerId,
      leadId: l.id,
      opportunityId: opportunities[i]?.id ?? "",
      service: l.service,
      departure: l.departure,
      destination: l.destination,
      travelDate: l.travelDate,
      passengers: l.passengers,
      budget: l.value,
      status: i < 15 ? "Confirmed" : "Under Review",
      ownerId: l.ownerId,
      requirements: l.notes,
    };
  });
  const bookings = Array.from({ length: 15 }, (_, i) => {
    const l = leads[i]!;
    const q = quotations[i]!;
    return {
      id: id(8, i),
      createdAt: date(28 + i),
      name: `MOCK-BK-${3001 + i}`,
      customerId: l.customerId,
      leadId: l.id,
      opportunityId: opportunities[i]!.id,
      quotationId: q.id,
      enquiryId: enquiries[i]!.id,
      service: l.service,
      route: `${l.departure} → ${l.destination}`,
      travelDate: l.travelDate,
      value: Math.round(q.items[0]!.unitPrice * 1.18),
      ownerId: l.ownerId,
      status: pick(["Confirmed", "Confirmed", "Completed", "Pending Confirmation", "Cancelled"], i),
      handover: pick(["Pending", "Ready", "Handed over"], i),
      passengers: l.passengers,
    };
  });
  for (const [i, booking] of bookings.entries()) {
    const lead = leads[i]!;
    lead.status = "Qualified";
    if (booking.status === "Completed") {
      booking.travelDate = date(39);
      booking.createdAt = date(35);
      booking.handover = "Handed over";
      lead.travelDate = booking.travelDate;
      enquiries[i]!.travelDate = booking.travelDate;
      enquiries[i]!.status = "Completed";
    } else if (booking.status === "Cancelled") {
      opportunities[i]!.stage = "Lost";
      opportunities[i]!.lossReason = "Travel plans changed";
      enquiries[i]!.status = "Cancelled";
    } else if (booking.status === "Pending Confirmation") {
      opportunities[i]!.stage = "Negotiation";
      enquiries[i]!.status = "Under Review";
    }
  }
  const tasks = Array.from({ length: 36 }, (_, i) => ({
    id: id(9, i),
    createdAt: date(30 + (i % 12)),
    title: pick(
      [
        "Discuss itinerary",
        "Send revised quotation",
        "Confirm passenger details",
        "Arrange discovery meeting",
        "Collect service requirements",
        "Review charter options",
      ],
      i,
    ),
    description: "Coordinate with the customer and record the next step.",
    leadId: leads[i]!.id,
    ownerId: team[i % 10]!.id,
    priority: pick(["High", "Medium", "Low"], i),
    due: date(38 + (i % 12), 8 + (i % 9)),
    status: pick(["Open", "In Progress", "Completed"], i),
    type: pick(["Call", "Email", "Meeting", "Follow-up", "Documentation", "Quotation"], i),
  }));
  const followups = tasks.slice(0, 28).map((t, i) => ({
    ...t,
    id: id(10, i),
    outcome: t.status === "Completed" ? "Customer requested revised options." : "",
  }));
  for (const lead of leads)
    lead.nextFollowup =
      followups
        .filter((f) => f.leadId === lead.id && f.status !== "Completed")
        .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0]?.due ?? "";
  const conversations = Array.from({ length: 32 }, (_, i) => ({
    id: id(11, i),
    createdAt: date(40 + (i % 3)),
    name: leads[i]!.name,
    leadId: leads[i]!.id,
    channel: pick(["WhatsApp", "Email", "Website", "SMS"], i),
    ownerId: leads[i]!.ownerId,
    unread: i % 4,
    status: pick(["Open", "Open", "Resolved"], i),
    draft: "",
  }));
  const messages = conversations.flatMap((c, i) => [
    {
      id: id(12, i * 2),
      createdAt: c.createdAt,
      conversationId: c.id,
      text: `Hello, could you share ${leads[i]!.service.toLowerCase()} options for ${leads[i]!.destination}?`,
      direction: "Incoming",
      attachment: "",
    },
    {
      id: id(12, i * 2 + 1),
      createdAt: c.createdAt,
      conversationId: c.id,
      text: "Sample reply: I have noted your requirements. We can review the available options together.",
      direction: "Mock outgoing",
      attachment: "",
    },
  ]);
  const activities = leads.map((l, i) => ({
    id: id(13, i),
    createdAt: l.createdAt,
    leadId: l.id,
    actor: "Sample import",
    action: "Lead Created",
    description: `Enquiry captured from ${l.source}.`,
  }));
  const integrations = [
    "Meta Lead Ads",
    "Facebook Pages",
    "Instagram",
    "Google Ads",
    "WhatsApp Business Platform",
    "Email Provider",
    "SMS Provider",
    "Viman Website",
    "Supabase CRM Backend",
    "Webhook Integrations",
  ].map((name, i) => ({
    id: id(14, i),
    createdAt: date(1),
    name,
    status: i === 7 ? "Connected (mock only)" : "Not Connected",
    description: pick(
      [
        "Capture and normalize enquiries",
        "Import campaign attribution",
        "Unify customer communication",
      ],
      i,
    ),
    lastSync: i === 7 ? date(42) : "",
    configuration: "",
  }));
  return {
    version: 1,
    leads,
    customers,
    opportunities,
    quotations,
    enquiries,
    bookings,
    tasks,
    followups,
    campaigns,
    team,
    conversations,
    messages,
    activities,
    integrations,
    assignments: [],
    documents: leads.slice(0, 12).map((l, i) => ({
      id: id(15, i),
      createdAt: l.createdAt,
      leadId: l.id,
      name: "Itinerary requirements.txt",
      status: "Reference only · no sensitive content",
    })),
    notifications: tasks.slice(0, 5).map((t, i) => ({
      id: id(16, i),
      createdAt: t.createdAt,
      text: t.title,
      read: false,
      leadId: t.leadId,
    })),
    templates: [
      "Lead Welcome",
      "Follow-up Reminder",
      "Quotation Sent",
      "Booking Confirmation",
      "Payment Reminder",
      "Post-Flight Feedback",
    ].map((name, i) => ({
      id: id(17, i),
      createdAt: date(1),
      name,
      channel: i % 2 ? "SMS" : "Email",
      subject: name,
      body: "Hello {{name}}, thank you for choosing Viman. Your aviation concierge is here to help with your journey.",
      status: "Template",
      scheduledAt: "",
      leadId: "",
    })),
    exports: [],
    audit: activities.slice(0, 15).map((a, i) => ({
      id: id(18, i),
      createdAt: a.createdAt,
      actor: a.actor,
      action: a.action,
      entity: "leads",
      entityId: a.leadId,
      description: a.description,
    })),
    settings: {
      workspace: "Viman CRM",
      stages: [...stages],
      sources: [...sources],
      statuses: ["New", "Contacted", "Qualified", "Unqualified", "Archived"],
      priorities: ["High", "Medium", "Low"],
      assignment: "Manual",
      notifications: true,
      theme: "light",
      customFields: [],
      reviewedDuplicates: [],
      savedViews: {},
      permissions: "Admin and Sales workspace · UI simulation only",
      columns: [],
    },
  };
}
