import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { redirect, isRedirect } from "@tanstack/react-router";

function authModule(role, profileError = false, memberStatus = "active") {
  const source = readFileSync(new URL("../src/lib/auth.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  let signedOut = false;
  vm.runInNewContext(compiled, {
    exports,
    window: {},
    require(name) {
      if (name === "react") return { createContext: () => ({}) };
      if (name === "react/jsx-runtime") return {};
      if (name === "@tanstack/react-router") return { redirect, isRedirect };
      return {
        supabase: {
          auth: {
            getUser: async () => ({ data: { user: role ? { id: "user" } : null } }),
            signOut: async () => {
              signedOut = true;
              return { error: null };
            },
          },
          rpc: async () => ({
            data: profileError ? null : [{ id: "user", role }],
            error: profileError ? new Error("profile failed") : null,
          }),
          from: () => ({
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({
              data: memberStatus ? { id: "member", status: memberStatus } : null,
              error: null,
            }),
          }),
        },
      };
    },
  });
  return { ...exports, wasSignedOut: () => signedOut };
}
for (const [role, path] of [
  ["ADMIN", "/admin/dashboard"],
  ["SALES", "/sales/dashboard"],
  ["CUSTOMER", "/customer/dashboard"],
  ["OPERATIONS", "/operations/dashboard"],
  ["OPERATOR", "/operator/dashboard"],
]) {
  test(`${role}: guest route and wrong-role guard preserve dashboard redirect`, async () => {
    const auth = authModule(role);
    assert.equal(auth.dashboardForRole(role), path);
    const matches = (error) => isRedirect(error) && error.options.to === path;
    await assert.rejects(auth.requireGuestAccess(), matches);
    await assert.rejects(auth.requireRoleAccess(["OTHER"]), matches);
    await auth.requireRoleAccess([role]);
  });
}
test("profile failure keeps login available", async () => {
  await authModule("OPERATIONS", true).requireGuestAccess();
});
test("unauthenticated dashboard redirects to login", async () => {
  await assert.rejects(
    authModule(null).requireRoleAccess(["ADMIN"]),
    (error) => isRedirect(error) && error.options.to === "/login",
  );
});
for (const role of ["OPERATIONS", "OPERATOR"]) {
  test(`${role}: inactive membership signs out and cannot route to a customer dashboard`, async () => {
    const auth = authModule(role, false, "inactive");
    await assert.rejects(
      auth.requireRoleAccess([role]),
      (error) => isRedirect(error) && error.options.to === "/login",
    );
    assert.equal(auth.wasSignedOut(), true);
    assert.equal(auth.dashboardForRole("UNKNOWN"), "/login");
  });
}
test("SALES: profile without its sales team record cannot access staff routes", async () => {
  const auth = authModule("SALES", false, null);
  await assert.rejects(
    auth.requireRoleAccess(["SALES"]),
    (error) => isRedirect(error) && error.options.to === "/login",
  );
  assert.equal(auth.wasSignedOut(), true);
});
