import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

function harness(options = {}) {
  const calls = [];
  let handler;
  const profileResult = (action, payload, id) => {
    if (action === "update") {
      return options.profileError
        ? { data: null, error: new Error("profile update failed") }
        : { data: { id }, error: null };
    }
    return { data: { role: options.callerRole ?? "ADMIN" }, error: null };
  };

  function makeQuery(table) {
    let action = "select";
    let payload;
    let id;
    const query = {
      select() {
        return query;
      },
      update(values) {
        action = "update";
        payload = values;
        return query;
      },
      insert(values) {
        action = "insert";
        payload = values;
        return query;
      },
      eq(_field, value) {
        id = value;
        return query;
      },
      maybeSingle: async () => {
        calls.push({ table, action, payload, id });
        if (table === "profiles") return profileResult(action, payload, id);
        return options.accountMissing
          ? { data: null, error: null }
          : { data: { profile_id: "target" }, error: null };
      },
      then(resolve, reject) {
        calls.push({ table, action, payload, id });
        const error =
          (action === "insert" && options.insertError) ||
          (action === "update" && options.profileError)
            ? new Error("directory setup failed")
            : null;
        return Promise.resolve({ error }).then(resolve, reject);
      },
    };
    return query;
  }

  function createClient(_url, key) {
    if (key === "anon-key") {
      return {
        auth: {
          getUser: async (token) => ({
            data: { user: token === "valid-token" ? { id: "caller" } : null },
            error: token === "valid-token" ? null : new Error("invalid token"),
          }),
        },
      };
    }
    return {
      auth: {
        admin: {
          createUser: async (payload) => {
            calls.push({ action: "createUser", payload });
            return options.createError
              ? { data: { user: null }, error: new Error("email already registered") }
              : { data: { user: { id: "target" } }, error: null };
          },
          deleteUser: async (id) => {
            calls.push({ action: "deleteUser", id });
            return { error: options.rollbackError ? new Error("rollback failed") : null };
          },
        },
      },
      from: makeQuery,
    };
  }

  const source = readFileSync(
    new URL("../src/lib/managed-account.functions.ts", import.meta.url),
    "utf8",
  );
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(
    javascript,
    {
      exports: {},
      process: {
        env: {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "anon-key",
          SUPABASE_SERVICE_ROLE_KEY: "service-key",
        },
      },
      require(name) {
        if (name === "@tanstack/react-start") {
          return {
            createServerFn: () => ({
              validator() {
                return this;
              },
              handler(fn) {
                handler = fn;
                return fn;
              },
            }),
          };
        }
        if (name === "@supabase/supabase-js") return { createClient };
        throw new Error(`Unexpected import ${name}`);
      },
    },
    { filename: "managed-account.functions.js" },
  );

  return {
    calls,
    invoke: (name, body = {}, accessToken = "valid-token") =>
      handler({ data: { accessToken, name, body } }),
  };
}

for (const [name, role, table] of [
  ["create-operator-user", "OPERATOR", "operators"],
  ["create-operations-user", "OPERATIONS", "operations_members"],
]) {
  test(`${role}: verifies administrator and creates login, role, and directory`, async () => {
    const h = harness();
    const result = await h.invoke(name, {
      email: " pilot@example.com ",
      password: "strong-password",
      contact_person: "Pilot Name",
      company_name: "",
    });
    assert.equal(result.user_id, "target");
    const user = h.calls.find((call) => call.action === "createUser");
    assert.equal(user.payload.email, "pilot@example.com");
    assert.equal(user.payload.password, "strong-password");
    assert.equal(user.payload.email_confirm, true);
    assert.equal(
      h.calls.find((call) => call.table === "profiles" && call.action === "update").payload.role,
      role,
    );
    assert.equal(
      h.calls.find((call) => call.table === table && call.action === "insert").payload.profile_id,
      "target",
    );
    assert.equal(
      h.calls.some((call) => call.action === "deleteUser"),
      false,
    );
  });
}

test("non-administrator cannot provision a staff account", async () => {
  const h = harness({ callerRole: "CUSTOMER" });
  await assert.rejects(
    h.invoke("create-operator-user", {
      email: "pilot@example.com",
      password: "strong-password",
      contact_person: "Pilot",
    }),
    /Only administrators/,
  );
  assert.equal(
    h.calls.some((call) => call.action === "createUser"),
    false,
  );
});

test("invalid access token cannot provision a staff account", async () => {
  const h = harness();
  await assert.rejects(
    h.invoke(
      "create-operator-user",
      {
        email: "pilot@example.com",
        password: "strong-password",
        contact_person: "Pilot",
      },
      "bad-token",
    ),
    /invalid or expired/,
  );
  assert.equal(
    h.calls.some((call) => call.action === "createUser"),
    false,
  );
});

test("directory failure rolls back the newly-created Auth user", async () => {
  const h = harness({ insertError: true });
  await assert.rejects(
    h.invoke("create-operator-user", {
      email: "pilot@example.com",
      password: "strong-password",
      contact_person: "Pilot",
    }),
    /directory record/,
  );
  assert.equal(h.calls.find((call) => call.action === "deleteUser").id, "target");
});

test("duplicate email is reported without creating a second user", async () => {
  const h = harness({ createError: true });
  await assert.rejects(
    h.invoke("create-operator-user", {
      email: "pilot@example.com",
      password: "strong-password",
      contact_person: "Pilot",
    }),
    /already registered/,
  );
  assert.equal(
    h.calls.some((call) => call.table === "operators" && call.action === "insert"),
    false,
  );
});
