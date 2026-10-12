import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
const cache = new Map();
const storage = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(new URL(`../src/features/crm/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (p) => load(p.replace("./", "")),
    Date,
    Map,
    Set,
    Intl,
    crypto: { randomUUID },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
  });
  cache.set(name, exports);
  return exports;
}
const { createFixtures } = load("fixtures"),
  model = load("model"),
  repo = load("repository");
test("Calendar days and overdue comparisons respect India timezone across midnight", () => {
  assert.equal(model.dayKey("2026-10-11T20:00:00Z"), "2026-10-12");
  assert.equal(model.dayKey("2026-10-12T20:00:00Z"), "2026-10-13");
  assert.equal(model.isOverdue("2026-10-12T09:30:00+05:30"), true);
  assert.equal(model.isOverdue("2026-10-12T11:00:00+05:30"), false);
});
test("CRM seed is deterministic and meets every minimum sample count", () => {
  const a = createFixtures(),
    b = createFixtures();
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  for (const [key, min] of Object.entries({
    leads: 100,
    customers: 30,
    opportunities: 40,
    campaigns: 12,
    team: 10,
    followups: 25,
    tasks: 30,
    quotations: 20,
    bookings: 15,
    conversations: 30,
  }))
    assert.ok(a[key].length >= min, `${key} minimum`);
  const ids = Object.values(a)
    .filter(Array.isArray)
    .flat()
    .map((x) => x.id);
  assert.equal(ids.length, new Set(ids).size);
});
test("All CRM foreign references resolve and campaign sources do not double-count", () => {
  const d = createFixtures();
  const refs = {
    leadId: "leads",
    customerId: "customers",
    opportunityId: "opportunities",
    quotationId: "quotations",
    enquiryId: "enquiries",
    campaignId: "campaigns",
    ownerId: "team",
    conversationId: "conversations",
  };
  for (const [key, rows] of Object.entries(d)) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      for (const [field, collection] of Object.entries(refs))
        if (r[field])
          assert.ok(
            d[collection].some((x) => x.id === r[field]),
            `${key} ${r.id}: invalid ${field}`,
          );
    }
  }
  for (const l of d.leads)
    assert.equal(l.source, d.campaigns.find((c) => c.id === l.campaignId).platform);
  assert.equal(
    d.settings.sources.reduce((n, s) => n + d.leads.filter((l) => l.source === s).length, 0),
    d.leads.length,
  );
});
test("Lead conversion and Booked stage never create an aircraft booking", () => {
  const d = createFixtures();
  const l = d.leads[70];
  const before = d.bookings.length;
  repo.convertLead(d, l.id);
  const o = d.opportunities[0];
  assert.equal(o.leadId, l.id);
  repo.moveOpportunity(d, o.id, "Booked");
  assert.equal(o.stage, "Booked");
  assert.equal(d.bookings.length, before);
  assert.throws(() => repo.moveOpportunity(d, o.id, "Lost", ""), /reason/);
  repo.moveOpportunity(d, o.id, "Lost", "Budget changed");
  assert.equal(o.lossReason, "Budget changed");
  assert.ok(d.activities.some((a) => a.leadId === l.id && a.action === "Pipeline Stage Changed"));
});
test("Duplicate merge preserves linked records, sources, and source record", () => {
  const d = createFixtures();
  const g = repo.duplicates(d)[0];
  assert.ok(g);
  const primary = g.primary.id,
    secondary = g.secondary.id;
  d.opportunities.push({ ...d.opportunities[0], id: randomUUID(), leadId: secondary });
  const total = d.opportunities.length;
  repo.mergeLeads(d, primary, secondary);
  assert.equal(d.opportunities.length, total);
  assert.ok(!d.opportunities.some((o) => o.leadId === secondary));
  assert.equal(d.leads.find((l) => l.id === secondary).status, "Archived");
  assert.ok(d.leads.find((l) => l.id === primary).sourceHistory.includes(g.secondary.source));
  assert.ok(d.audit.some((a) => a.action === "Lead Merged"));
});
test("Duplicate merge refuses to combine conflicting customer identities", () => {
  const d = createFixtures();
  const g = repo.duplicates(d)[0];
  g.secondary.customerId = d.customers.find((c) => c.id !== g.primary.customerId).id;
  assert.throws(() => repo.mergeLeads(d, g.primary.id, g.secondary.id), /different customers/);
});
test("Assignment updates lead and linked opportunities with history", () => {
  const d = createFixtures();
  const l = d.leads[0];
  repo.assignLead(d, l.id, d.team[4].id, "Manual");
  assert.equal(l.ownerId, d.team[4].id);
  assert.ok(d.opportunities.filter((o) => o.leadId === l.id).every((o) => o.ownerId === l.ownerId));
  assert.equal(d.assignments[0].ownerId, l.ownerId);
});
test("Quotation totals include quantity, percentage tax and absolute discount", () => {
  assert.equal(
    model.quoteTotal({
      items: [
        { quantity: 2, unitPrice: 1000 },
        { quantity: 1, unitPrice: 500 },
      ],
      tax: 18,
      discount: 200,
    }),
    2750,
  );
  assert.equal(model.quoteTotal({ items: [], tax: 18, discount: 200 }), 0);
});
test("CSV round trip handles quotes, commas, newlines and formula prefixes", () => {
  const text = repo.csv(
    [{ name: 'Aarav, "VIP"', notes: "Line one\nLine two", value: '=HYPERLINK("x")' }],
    ["name", "notes", "value"],
  );
  const rows = repo.parseCsv(text);
  assert.equal(rows[0].name, 'Aarav, "VIP"');
  assert.equal(rows[0].notes, "Line one\nLine two");
  assert.equal(rows[0].value, '\'=HYPERLINK("x")');
  assert.throws(() => repo.parseCsv('name\n"unclosed'), /Unclosed/);
});
test("Repository persists shared changes and surfaces unreadable storage", async () => {
  const d = createFixtures();
  d.leads[0].name = "Saved locally";
  await repo.mockRepository.save(d);
  assert.equal((await repo.mockRepository.load()).leads[0].name, "Saved locally");
  storage.set(repo.STORAGE_KEY, "{invalid");
  await assert.rejects(repo.mockRepository.load());
  storage.clear();
});
test("All 25 CRM page routes exist and use the retained TanStack router", () => {
  const pages = [
    "dashboard",
    "analytics",
    "leads",
    "pipeline",
    "customers",
    "assignments",
    "duplicates",
    "enquiries",
    "quotations",
    "bookings",
    "followups",
    "tasks",
    "campaigns",
    "social-leads",
    "whatsapp-leads",
    "website-leads",
    "integrations",
    "inbox",
    "email-sms",
    "conversations",
    "reports",
    "performance",
    "exports",
    "settings",
    "audit-logs",
  ];
  for (const page of pages) {
    const file = new URL(`../src/routes/crm.${page}.tsx`, import.meta.url);
    assert.ok(existsSync(file));
    assert.ok(readFileSync(file, "utf8").includes(`createFileRoute("/crm/${page}")`));
  }
});
