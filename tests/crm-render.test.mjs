import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url),
  cache = new Map();
let fixture;
const noop = () => {};
function load(name) {
  if (name === "store")
    return {
      useCrm: () => ({
        data: fixture,
        loading: false,
        error: "",
        busy: false,
        mutate: async () => true,
        retry: noop,
        failNext: noop,
      }),
    };
  if (name === "layout") return { useCrmUI: () => ({ form: noop, lead: noop }) };
  if (cache.has(name)) return cache.get(name);
  let file = new URL(`../src/features/crm/${name}.tsx`, import.meta.url);
  if (!existsSync(file)) file = new URL(`../src/features/crm/${name}.ts`, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file.pathname,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  cache.set(name, exports);
  vm.runInNewContext(compiled, {
    exports,
    require: (path) => {
      if (path.startsWith("./")) return load(path.slice(2));
      if (path === "@tanstack/react-router")
        return {
          Link: ({ to, children, ...props }) =>
            React.createElement("a", { href: to, ...props }, children),
        };
      if (path === "@/components/ui/dialog")
        return {
          Dialog: ({ children }) => children,
          DialogContent: ({ children, className }) =>
            React.createElement("div", { className }, children),
          DialogTitle: ({ children }) => React.createElement("h2", {}, children),
          DialogDescription: ({ children }) => React.createElement("p", {}, children),
        };
      return require(path);
    },
    Date,
    Map,
    Set,
    Intl,
    crypto: { randomUUID },
    console,
  });
  return exports;
}
fixture = load("fixtures").createFixtures();
const { CrmPage } = load("CrmPage");
const pages = load("config").navigation.flatMap((g) => g.items.map((i) => i[0]));
for (const page of pages)
  test(`CRM /${page} renders its populated initial view`, () => {
    const html = renderToStaticMarkup(React.createElement(CrmPage, { page }));
    assert.ok(html.length > 600, page + " rendered meaningful content");
    assert.ok(!html.includes("[object Object]"), page + " has no malformed display values");
  });
const { RecordForm } = load("forms");
for (const kind of [
  "leads",
  "customers",
  "opportunities",
  "tasks",
  "followups",
  "campaigns",
  "quotations",
  "templates",
])
  test(`CRM ${kind} create and edit forms render`, () => {
    for (const request of [{ kind }, { kind, id: fixture[kind][0].id }]) {
      const html = renderToStaticMarkup(
        React.createElement(RecordForm, { request, onClose: noop }),
      );
      assert.ok(html.includes("Save locally"));
      assert.ok(!html.includes('value="undefined"'));
    }
  });
