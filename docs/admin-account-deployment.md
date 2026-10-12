# Operations and operator account fix

The frontend uses admin-only Edge Functions to create confirmed login accounts,
assign their role and save directory records. It no longer calls public signup or
the undocumented `create_operations_member` / `create_operator_account` RPCs.

## Deploy to the website's Supabase project

Target project: `vksysbzzyymomnvywrik`. The currently logged-in CLI account did not
list this project; sign in with an account that owns it before deploying. Never
put a service-role key in a Vite environment variable or in browser code.

In this project's SQL editor, apply these files in order, as **separate runs**:

1. `supabase/migrations/20260927000100_operations_operator_roles.sql`
2. `supabase/migrations/20261010000100_managed_account_updates.sql`

The first migration creates the roles, directories and admin/self RLS policies.
The second synchronizes edits to profiles and prevents direct self-promotion.
Review existing migration history before using a bulk `db push`; older unrelated
migrations in this repository reference tables before their creation.

Deploy the three functions using the authenticated Supabase CLI:

```powershell
supabase functions deploy create-operations-user --project-ref vksysbzzyymomnvywrik
supabase functions deploy create-operator-user --project-ref vksysbzzyymomnvywrik
supabase functions deploy delete-managed-user --project-ref vksysbzzyymomnvywrik
```

Deploy the frontend after the backend. Supabase provides the server-side service
key to the Edge Functions; each function verifies the caller's token and ADMIN
profile before using it.

## Existing failed signups

A previous public signup may have created an Auth user without its directory row.
The new create flow deliberately refuses to overwrite another account/password.
Review the affected email in Authentication > Users and `profiles` first. If it
is an unused account from a failed attempt, an authorized administrator can remove
it and recreate it through the fixed page. Preserve accounts with existing data;
repair their role and missing directory record after confirming their identity.
Do not bulk-delete users or assign roles based only on untrusted signup metadata.

## Verify after deployment

- Create one account in each admin directory; confirm the admin stays signed in
  and the new row remains visible after reloading.
- Sign in with each created email/password in a separate browser session. Expect
  `/operations/dashboard` or `/operator/dashboard`. Pending operators see a
  verification notice. These dashboard pages currently contain placeholders.
- Edit names/contact information and verify both directory and profile updates.
  Login email is intentionally read-only in the edit form.
- Change status and reload. Delete a disposable test account, confirm its row is
  gone and that it can no longer sign in. Foreign-key restrictions must return an
  error without removing the directory row.
- Confirm non-admin users cannot invoke creation/deletion or edit directory rows.

Local mocked handler regression tests: `node --test tests/auth-routing.test.mjs tests/managed-accounts.test.mjs`.
These test authorization, creation/role assignment, rollback and deletion guards;
they do not replace live database/RLS verification.

The reported `cz-shortcut-listen` hydration mismatch is an extra browser DOM
attribute, absent from this source. Re-test with extensions disabled. No global
hydration-warning suppression is added.
