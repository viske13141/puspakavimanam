# Managed staff accounts

Admin account creation now runs in a TanStack Start server function. The browser
sends its signed-in access token; the server verifies that token and confirms the
caller has the `ADMIN` profile role before it uses Supabase Auth administration
to create a staff login. The service-role key is never sent to the browser.

Set these variables in the server environment for local development and every
deployment that serves the TanStack Start server:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the Supabase project URL and anon/publishable key for the first two values.
Set the service-role key only in server-side secrets; never add it to a
`VITE_*` variable, client bundle, or source control. The server function creates
the Auth user, updates the trigger-created profile role, and creates its
Operations/Operator directory row. If setup fails, it attempts to remove the
new Auth user and reports any rollback failure explicitly.

Operations and Operator logins are allowed only when their linked directory
row exists and has `status = 'active'`. Operators may be provisioned in
`pending_verification`; an administrator must activate them before they can
access the Operator portal. Operator name is required; the legacy
`operators.company_name` column remains intact and is optional in the UI.

Apply the normal Supabase migrations before using the Sales status controls;
`20261013000100_staff_request_status_timeline.sql` makes each permitted status
change and its timeline entry atomic and checks the caller's role in the
database.

## Read-only existing-account audit

Run `supabase/manual/managed-staff-account-audit.sql` in the Supabase SQL
Editor to identify missing directory records, role mismatches, inactive
memberships, and profile/directory email mismatches. It only reads data.
Review each result against the intended account owner before repair.

Do not bulk-promote profiles or infer identity from matching names. For an
incomplete account, first verify the Auth user's UUID and email, confirm the
account was intended to be staff, and confirm no other staff directory row
already links to that profile. Then use the commented, single-account SQL
template in the audit file inside a transaction, substituting the reviewed
UUID/email and the intended status. The repair statements are commented out
and must be deliberately uncommented; this file is not a migration and the
application does not execute it.
