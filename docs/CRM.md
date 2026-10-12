# Viman CRM — frontend workspace

Open `/crm/dashboard`, or choose **Viman CRM** from the existing Admin or Sales navigation. `/crm` redirects to the dashboard. All 25 requested pages use the existing TanStack file router. This phase is an explicitly labeled mock workspace; it does not read or mutate production CRM data.

## Architecture

- `src/features/crm/model.ts`: separate typed entities with stable relationships.
- `fixtures.ts`: deterministic Indian aviation sample data anchored to 12 October 2026.
- `repository.ts`: local repository contract, workflow mutations, duplicate review, CSV parsing/export and audit events.
- `store.tsx`: shared state, asynchronous repository boundary, optimistic save and rollback on failure.
- `layout.tsx`, `ui.tsx`, `forms.tsx`, `profile.tsx`: responsive navigation, shared table controls, forms and linked lead profiles.
- Dedicated dashboard, lead, pipeline, sales, management, communication and administration modules.
- `crm.css`: scoped styles using existing Manrope/Cormorant typography and champagne/obsidian branding; CRM-only light/dark preferences.

The sample contains 108 leads, 30 customers, 42 opportunities, 12 campaigns, 10 sales members, 28 follow-ups, 36 tasks, 24 quotations, 15 booking links, 45 enquiries and 32 conversations. Customers are not login accounts. Customer, lead, enquiry, opportunity and booking IDs remain distinct.

## Local behavior

Records persist under `viman.crm.v1` in browser local storage. No server endpoint, migration, Edge Function, OAuth flow or advertising/messaging integration is added. Existing authentication and dashboards are retained. The CRM preview is accessible without production CRM authorization because it contains only local sample data; real API access must introduce server-enforced authorization.

Dashboard/report date filters select a **lead-created cohort**; linked opportunity, booking, task and campaign metrics use that cohort. Revenue includes confirmed/completed mock booking links, not opportunities merely moved to Booked. Sources are mutually exclusive; Meta, Facebook and Instagram are not summed twice. Period comparisons derive from the preceding cohort.

Quotation totals apply percentage taxes/fees to item subtotals, then subtract a fixed INR discount, clamped to zero. Pipeline Booked is a sales outcome and never creates a booking/PNR/ticket. Lost requires a reason. Duplicate merging archives the secondary lead, preserves its source record and attribution, and moves linked records; conflicting customer identities are rejected.

Import CSV headers: `name,email,mobile,service` (email or mobile is required). Supported services: Helicopter, Private Jet, Aviation Event, VIP Transport. Optional columns include company, city, source and value. Imports skip exact normalized contact matches and record counts in the local audit log. CSV exports quote cells and neutralize spreadsheet formula prefixes. Document contents are not exported.

Messages are saved as local drafts, internal notes, or explicitly labeled mock outgoing messages. File attachments record the filename only. Phone, email and WhatsApp actions open user-initiated external links; no delivery is asserted. Scheduled messages are local records and do not run a background sender. Integration forms accept mapping preferences, not credentials.

Settings → Data Management → **Simulate next save failure** exercises rollback. Local audit history is editable browser data, not a security audit trail.

## Validation

Run `node --test tests/crm.test.mjs tests/crm-render.test.mjs` for seed integrity, relationship preservation, workflow mutations, quotation arithmetic, CSV handling, all 25 populated page renders, and create/edit form rendering. Run `npm run build` for the existing Vite/Nitro deployment build. Existing project-wide TypeScript errors outside CRM should be tracked separately; no compiler options are relaxed.

Browser interaction and visual acceptance testing are still required before treating this frontend preview as a production release. Future APIs should replace `CrmRepository`, validate payloads on the server and enforce authenticated permissions.

Verification completed: production Vite/Nitro build passed; 70 automated tests passed across CRM and existing auth/aviation/account-management suites; all 25 CRM routes returned HTTP 200 in local preview. The project-wide TypeScript check reported zero CRM diagnostics and 119 diagnostics in existing non-CRM files. Interactive browser and screenshot QA were unavailable in this environment.
