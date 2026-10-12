import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = new URL(`../src/features/aviation/${name}.ts`, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: path => load(path.replace("./", "")), Date, Map, Set });
  cache.set(name, exports); return exports;
}
const m = load("model"), fixture = load("fixtures");
for (const [name, factory] of [["operations", fixture.createDemoData], ["operator", fixture.createOperatorData]]) {
  test(`${name}: every flight, aircraft, crew, booking and passenger reference exists`, () => {
    const data = factory();
    for (const f of data.flights) {
      assert.ok(data.bookings.some(b => b.id === f.fields.booking), f.id + " booking");
      if (f.fields.aircraft) assert.ok(data.aircraft.some(a => a.id === f.fields.aircraft), f.id + " aircraft");
      if (f.fields.operator) assert.ok(data.operators.some(o => o.id === f.fields.operator), f.id + " operator");
      assert.ok(data.crew.some(c => c.id === f.fields.crew));
    }
    for (const a of data.aircraft) assert.ok(data.operators.some(o => o.id === a.fields.operator));
    for (const p of data.passengers) assert.ok(data.bookings.some(b => b.id === p.fields.booking));
    for (const kind of ["checks", "compliance", "incidents", "hems", "documents", "notifications", "tasks"]) for (const r of data[kind]) assert.ok(data.flights.some(f => f.id === r.fields.flight), `${kind} ${r.id}`);
  });
}
test("operator company selector includes only related records across every dataset", () => {
  const data = fixture.createOperatorData();
  for (const company of data.operators) {
    const scope = m.companyData(data, company.id);
    assert.equal(scope.operators.length, 1);
    for (const kind of ["aircraft", "crew", "requests", "quotes", "blocks", "messages", "profile", "flights"]) for (const row of scope[kind]) assert.equal(row.fields.operator, company.id, `${kind}:${row.id}`);
    for (const pax of scope.passengers) assert.ok(scope.bookings.some(b => b.id === pax.fields.booking));
    for (const document of scope.documents) assert.ok(scope.flights.some(f => f.id === document.fields.flight));
    for (const quote of scope.quotes) {
      assert.ok(scope.requests.some(r => r.id === quote.fields.request));
      assert.ok(scope.aircraft.some(a => a.id === quote.fields.aircraft));
    }
    for (const check of scope.checks) assert.ok(scope.documents.some(d => d.id === check.fields.evidence), check.id + " evidence");
  }
});
test("scoped mutation rejects foreign records and foreign assignment references", () => {
  const data = fixture.createOperatorData();
  const scope = m.companyData(data, "OP-001");
  assert.equal(m.canApplyCompanyAction(data, "OP-001", { type: "patch", kind: "aircraft", id: "AC-002", fields: { notes: "cross company" }, message: "test" }), false);
  assert.equal(m.canApplyCompanyAction(data, "OP-001", { type: "patch", kind: "crew", id: scope.crew[0].id, fields: { flight: data.flights.find(f => f.fields.operator !== "OP-001").id }, message: "test" }), false);
  assert.equal(m.canApplyCompanyAction(data, "OP-001", { type: "patch", kind: "profile", id: scope.profile[0].id, fields: { aoc: "overwrite" }, message: "test" }), false);
  assert.equal(m.canApplyCompanyAction(data, "OP-001", { type: "patch", kind: "aircraft", id: scope.aircraft[0].id, fields: { notes: "valid edit" }, message: "test" }), true);
});
test("shared record updates preserve immutable seed and propagate derived readiness", () => {
  const data = fixture.createDemoData(); const flight = data.flights[0]; let state = { data, revision: 0 };
  const checks = data.checks.filter(c => c.fields.flight === flight.id);
  for (const c of checks) state = m.reducer(state, { type: "patch", kind: "checks", id: c.id, status: "Verified", message: "reviewed demo" });
  assert.equal(m.displayRow(state.data, "flights", state.data.flights[0]).fields.readiness, "Ready");
  assert.ok(data.checks.some(c => c.status !== "Verified"));
  assert.equal(state.data.checks[0].history.at(-1).includes("reviewed demo"), true);
});
test("quotation calculation applies costs, hours, taxes and safe rounding", () => {
  assert.equal(m.quoteTotal({ hourlyRate: "85000", hours: "1.5", positioning: "12000", landing: "5000", handling: "3000", other: "0", tax: "5" }), 154875);
  assert.equal(m.quoteTotal({ hourlyRate: "0.1", hours: "3", tax: "0" }), 0.3);
});
test("conflict detection recognizes overlap and respects cancelled flights and boundaries", () => {
  const data = fixture.createDemoData(); const f = data.flights.find(f => f.fields.aircraft); const other = { ...f, id: "OTHER", status: "Scheduled", fields: { ...f.fields, departure: "10:00", duration: "60" } }; data.flights.push(other);
  assert.ok(m.conflicts(data, f, other.fields.date, "10:30").some(r => r.id === "OTHER"));
  assert.equal(m.conflicts(data, f, other.fields.date, "11:00").some(r => r.id === "OTHER"), false);
  other.status = "Cancelled";
  assert.equal(m.conflicts(data, f, other.fields.date, "10:30").some(r => r.id === "OTHER"), false);
});
test("CSV quotes delimiters and protects spreadsheet formulas", () => {
  assert.equal(m.csv([["A,B", 'A"B', "=SUM(1,2)"]]), '"A,B","A""B","\'=SUM(1,2)"');
});
const pages = {
  operations: "dashboard bookings schedule assignments operators aircraft crew passengers checkin landing-sites ground-handling preparation compliance monitoring incidents hems documents reports notifications profile".split(" "),
  operator: "dashboard requests quotes bookings aircraft availability crew schedule preparation passengers ground flights compliance incidents messages reports notifications profile".split(" "),
};
for (const [mode, names] of Object.entries(pages)) test(`${mode}: all ${names.length} routes registered beneath unchanged role guard`, () => {
  const parent = readFileSync(new URL(`../src/routes/${mode}.tsx`, import.meta.url), "utf8");
  assert.ok(parent.includes(`requireRoleAccess(["${mode.toUpperCase()}"])`));
  const tree = readFileSync(new URL("../src/routeTree.gen.ts", import.meta.url), "utf8");
  for (const page of names) {
    assert.ok(existsSync(new URL(`../src/routes/${mode}.${page}.tsx`, import.meta.url)));
    assert.ok(tree.includes(`/${mode}/${page}`));
  }
});
