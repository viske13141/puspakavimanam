import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:8081";
const targets = await (await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(targets.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
let serial = 0, role = "OPERATIONS";
const pending = new Map(), errors = [], unexpected = [];
const user = { id: "11111111-1111-4111-8111-111111111111", email: "demo@example.com", aud: "authenticated", role: "authenticated", created_at: "2026-09-20T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Demo Reviewer" } };
function send(method, params = {}) { const id = ++serial; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
ws.addEventListener("message", async event => {
  const msg = JSON.parse(event.data);
  if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); if (msg.error) p?.reject(new Error(JSON.stringify(msg.error))); else p?.resolve(msg.result); }
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === "Fetch.requestPaused") {
    const { requestId, request } = msg.params;
    let response = {};
    if (request.url.includes("/auth/v1/user")) response = user;
    else if (request.url.includes("get_my_profile")) response = [{ id: user.id, full_name: "Demo Reviewer", email: user.email, role, mobile: null, country: null, company: null, avatar_url: null }];
    else { unexpected.push(request.url); response = []; }
    await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: origin }, { name: "Access-Control-Allow-Headers", value: "*" }], body: Buffer.from(JSON.stringify(response)).toString("base64") });
  }
});
const evaluate = async expression => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value; };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression, timeout = 60000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await delay(200); } throw new Error("Timeout: " + expression + "\n" + await evaluate("document.body.innerText.slice(0,1200)")); }
async function clickText(text) { const ok = await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(e){e.click();return true}return false})()`); assert.ok(ok, "button " + text); await delay(150); }
async function input(selector, value) {
  const tag = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');e.focus();if(e.select)e.select();return e.tagName})()`);
  if (tag === "SELECT") await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  else {
    await send("Input.insertText", { text: value });
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  }
  await delay(300);
}
async function route(mode, page) {
  const title = await evaluate(`(()=>{const a=document.querySelector('a.av-nav-link[href="/${mode}/${page}"]');const name=a.textContent.trim().replace(/\\d+$/,'').trim();a.click();return name})()`);
  await waitFor(`location.pathname==='/${mode}/${page}' && document.querySelector('.av-page-heading h1')?.textContent===${JSON.stringify(title)}`);
  await delay(300);
  assert.ok(!await evaluate("document.body.innerText.includes(\"Something went wrong on our end\")"));
}
await send("Page.enable"); await send("Runtime.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "*supabase.co/*", requestStage: "Request" }] });
const jwt = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 86400, role: "authenticated", aud: "authenticated" })).toString("base64url"), "test-signature"].join(".");
const session = { access_token: jwt, refresh_token: "local-test-token", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now()/1000) + 86400, user };
await send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.setItem('sb-vksysbzzyymomnvywrik-auth-token',${JSON.stringify(JSON.stringify(session))}); } catch {}` });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
mkdirSync("node_modules/.aviation-review", { recursive: true });
const routeSets = { operations: "dashboard bookings schedule assignments operators aircraft crew passengers checkin landing-sites ground-handling preparation compliance monitoring incidents hems documents reports notifications profile".split(" "), operator: "dashboard requests quotes bookings aircraft availability crew schedule preparation passengers ground flights compliance incidents messages reports notifications profile".split(" ") };
for (const [mode, pages] of Object.entries(routeSets)) {
  role = mode.toUpperCase();
  await send("Page.navigate", { url: `${origin}/${mode}/dashboard` });
  await waitFor("document.querySelectorAll('.av-nav-link').length > 10", 120000);
  console.log(mode, "dashboard loaded");
  assert.equal(await evaluate("document.querySelectorAll('.av-nav-link').length"), pages.length);
  await delay(1000);
  writeFileSync(`node_modules/.aviation-review/${mode}-desktop.png`, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  for (const page of pages) { await route(mode, page); console.log("route", mode, page, "OK"); }
  await route(mode, "aircraft");
  await input('input[aria-label="Search records"]', "NO-SUCH-AIRCRAFT");
  await waitFor("document.body.innerText.includes('No matching records')");
  await clickText("Clear search");
  await evaluate("document.querySelector('tbody button.av-record-link').click()");
  await waitFor("document.querySelector('[role=dialog]')");
  assert.ok(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Activity timeline')"));
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Close').click()");
  await route(mode, "notifications");
  await clickText("Mark all as read");
  assert.ok(await evaluate("document.querySelector('[aria-label=\"0 unread notifications\"]')!==null"));
  await route(mode, "dashboard");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(300);
  assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "mobile overflow");
  await evaluate("document.querySelector('[aria-label=\"Open navigation\"]').click()");
  await waitFor("document.querySelector('.av-mobile-sidebar[data-state=open]')");
  writeFileSync(`node_modules/.aviation-review/${mode}-mobile-menu.png`, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await evaluate(`document.querySelector('.av-mobile-sidebar a[href="/${mode}/bookings"]').click()`);
  await waitFor(`location.pathname==='/${mode}/bookings'`);
  assert.ok(await evaluate("document.querySelector('.av-mobile-sidebar[data-state=open]')===null"));
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}
console.log("Runtime errors:", JSON.stringify(errors));
console.log("Unexpected backend requests:", JSON.stringify(unexpected));
assert.equal(errors.length, 0);
assert.equal(unexpected.length, 0);
console.log("BROWSER SMOKE PASS: 38 routes, scoped auth fixtures, search, drawers, shared notification state, mobile navigation and overflow.");
await send("Page.close"); ws.close();
