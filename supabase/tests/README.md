# Database security tests

`run-rls-tests.sh` applies the full migration set to a disposable PostgreSQL 16
container and runs the four-persona RLS suite in `20_rls.sql`.

It approximates the Supabase runtime with:

- `anon`, `authenticated`, and `service_role` roles
- an `auth.uid()` shim driven by `request.jwt.claim.sub`
- a minimal `auth.users` table and the profile-creation trigger
- minimal `storage.buckets` and `storage.objects` tables for migration 004

The suite is intentionally adversarial. It verifies that:

- anonymous callers cannot read profiles, spaces, messages, or participants;
- a member can read their own space and co-member profiles without RLS recursion;
- an unrelated member cannot read or write another space;
- messages cannot point at a conversation in a different space;
- a sender cannot mutate another sender's message;
- a non-owner cannot create invitations;
- editors and administrators do not receive private-content access;
- admins can manage roles and read audit events;
- `service_role` retains the server-side bypass path;
- space-less direct conversations work for participants only;
- the invitation token default is URL-safe.

Run it from the repository root:

```bash
bash supabase/tests/run-rls-tests.sh
```

This is a fast local check, not a replacement for applying migrations to a
staging Supabase project. The shim does not reproduce every Supabase extension,
policy default, or storage behavior.
