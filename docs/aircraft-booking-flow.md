# Customer aircraft booking flow

The public Journey Planner saves only the aircraft selection, passenger count,
budget, currency, optional aircraft preference, and timestamp in the browser
under `viman:aircraft-booking-draft:v1`. It creates no request before sign-in.
After sign-in, the customer explicitly confirms importing that selection on the
Customer Dashboard. Signed-in customers can continue directly to the flight
form. Other roles are sent to their existing dashboard and never receive a
customer-owned draft.

Apply `supabase/migrations/20261011000100_aircraft_booking_drafts.sql` in the
Supabase SQL editor after the existing portal, request-mode, and passenger
migrations. It adds a customer-owned draft table with owner-only RLS and an
authenticated `submit_aircraft_booking_draft` RPC. The RPC validates ownership
and role, inserts one `AVIATION` request in `BOOKING` mode and all linked
passenger records in a single transaction, writes a request timeline event,
and stores the created request ID on the draft for retry-safe submission. It
does not create a `booking_records` row or call an Edge Function.

Authenticated draft payloads, including passenger and contact information,
remain in `customer_booking_drafts` protected by owner RLS while incomplete.
The anonymous browser draft never contains contact details, passenger data,
passwords, tokens, or documents. On successful submission, the database
function clears the draft payload after moving request and passenger data to
their existing tables. Identity documents remain part of the existing
post-submission passenger compliance workflow.

The request uses the project's existing `AVIATION` service type, `flight` or
`helicopter` subtype, `SUBMITTED` status, and `BOOKING` request mode. Sales and
Admin continue to see the same request row through their existing workflow.
Operations and operators do not receive a confirmed flight from a submitted
request; a confirmed booking still requires the existing authorized process.

## Apply the migration

Run the complete SQL file above as one migration in Supabase SQL Editor. Do not
run it alongside the managed operator migration unless both changes are wanted.
Then rebuild and deploy the frontend.

## Verify

- Begin a helicopter or private aircraft selection while signed out, refresh,
  then sign in. The selection remains on the dashboard until the customer
  confirms importing it.
- Save an incomplete form and refresh or use Save & Exit; confirm it resumes
  with its current step and passenger/contact values.
- Submit once and confirm exactly one `requests` row with `request_mode =
  'BOOKING'`, plus the matching number of `passengers` rows. Retry after a
  network interruption and confirm the RPC returns the same request.
- Confirm no `booking_records` row was created, and the request is visible in
  the existing Customer, Sales, and Admin request surfaces.
- With another customer account, verify neither drafts nor passenger/contact
  details from the first account are visible.
