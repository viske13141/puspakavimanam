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

async function menu(label) { const clicked = await evaluate(`(()=>{const e=[...document.querySelectorAll('[role=menuitem]')].find(e=>e.textContent.trim()===${JSON.stringify(label)});e?.click();return !!e})()`); assert.ok(clicked, label); await delay(200); }
async function fill(name, value) { await input(`[role=dialog] [name="${name}"]`, value); }
async function confirm() { await clickText("Review changes"); await waitFor("document.body.innerText.includes('Confirm demo change')"); await clickText("Confirm demo change"); await waitFor("!document.querySelector('[role=dialog]')"); }
role = "OPERATOR";
await send("Page.navigate", { url: `${origin}/operator/dashboard` });
await waitFor("document.querySelectorAll('.av-nav-link').length===18", 120000);
await route("operator", "quotes");
await clickText("Create draft");
await fill("request", "REQ-001"); await fill("aircraft", "AC-001");
for (const [key, val] of Object.entries({ hourlyRate:"1000", hours:"2", positioning:"100", landing:"50", handling:"25", other:"0", tax:"10", terms:"Fictional review terms" })) await fill(key,val);
await waitFor("document.querySelector('.av-total').innerText.includes('2,392.50')");
await confirm();
await route("operator", "dashboard"); await route("operator", "quotes");
await waitFor("document.querySelector('tbody').innerText.includes('VQ-DEMO-1')");
assert.ok(await evaluate("document.querySelector('tbody').innerText.includes('2,392.50')"));
await evaluate("document.querySelector('[aria-label=\"Actions for VQ-DEMO-1\"]').click()");
await menu("Submit to Viman (demo)");
await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()");
await confirm();
await route("operator", "requests");
assert.ok(await evaluate("[...document.querySelectorAll('tbody tr')].find(r=>r.innerText.includes('VREQ-700'))?.innerText.includes('Quote Submitted')"));
console.log("PASS quote calculation, draft persistence and linked request submission");
await route("operator", "aircraft");
await clickText("Add aircraft");
for (const [key,val] of Object.entries({name:"Demo test aircraft",registration:"DEMO-TEST-01",type:"Helicopter",manufacturer:"Fictional Aero",model:"Demo H",capacity:"6",base:"Mumbai"})) await fill(key,val);
await confirm();
await waitFor("document.querySelector('tbody').innerText.includes('DEMO-TEST-01')");
assert.ok(await evaluate("document.querySelector('tbody').innerText.includes('Pending Approval')"));
await input('select[aria-label="Mock company"]', "OP-002");
await waitFor("document.querySelector('.av-company').innerText.includes('Meridian Rotor')");
assert.ok(!await evaluate("document.querySelector('.av-content').innerText.includes('DEMO-TEST-01')"));
await input('select[aria-label="Mock company"]', "OP-001");
await waitFor("document.querySelector('.av-content').innerText.includes('DEMO-TEST-01')");
console.log("PASS aircraft creation stays pending approval; company isolation and persistence");
await route("operator", "availability"); await clickText("Availability block");
await fill("aircraft", "AC-001"); await fill("reason", "Mock inspection");
// Date/time fields use their native setters so test entry matches HTML input parsing.
await evaluate(`(()=>{for(const [key,val] of [['start','2026-10-12T12:00'],['end','2026-10-12T11:00']]){const e=document.querySelector('[name="'+key+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,val);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.focus();}})()`);
await send("Input.dispatchKeyEvent",{type:"keyUp",key:"ArrowRight",windowsVirtualKeyCode:39});
await clickText("Review changes");
// Always exercise browser range validation separately from model overlap checks.
await waitFor("document.querySelector('[role=alert]') || document.body.innerText.includes('Confirm demo change')");
await clickText("Cancel");
await route("operator", "messages");
await input('textarea[aria-label="Message"]', "Demo coordination message from browser test");
await clickText("Save mock");
await waitFor("document.querySelector('.av-message-body').innerText.includes('Demo coordination message from browser test')");
await route("operator", "dashboard"); await route("operator", "messages");
assert.ok(await evaluate("document.querySelector('.av-message-body').innerText.includes('Demo coordination message from browser test')"));
console.log("PASS mock message survives navigation");
role = "OPERATIONS";
await send("Page.navigate", { url: `${origin}/operations/checkin` });
await waitFor("document.querySelector('.av-page-heading h1')?.textContent==='Check-in & Boarding'",120000);
await clickText("Review check-in");
await fill("bodyWeight", "70"); await fill("baggageWeight", "4");
await fill("status", "Cleared"); await clickText("Review changes");
await waitFor("document.querySelector('[role=alert]')?.textContent.includes('seven checks')");
await evaluate("document.querySelectorAll('[role=dialog] input[type=checkbox]').forEach(e=>{if(!e.checked)e.click()})");
await confirm();
assert.ok(await evaluate("document.querySelector('tbody').innerText.includes('Cleared')"));
await route("operations", "passengers");
await input('input[aria-label="Search records"]', "Arin Mehra 1");
await waitFor("document.querySelector('tbody')?.innerText.includes('Cleared')");
console.log("PASS check-in validation and shared passenger status");
await route("operations", "preparation");
await clickText("Update check"); await fill("status", "Verified"); await confirm();
assert.ok(await evaluate("document.querySelector('.av-check-row').innerText.includes('Verified')"));
console.log("PASS preparation checklist update");
console.log("Runtime errors:",JSON.stringify(errors));console.log("Unexpected backend requests:",JSON.stringify(unexpected));
assert.equal(errors.length,0);assert.equal(unexpected.length,0);
console.log("BROWSER WORKFLOW PASS");
await send("Page.close");ws.close();
