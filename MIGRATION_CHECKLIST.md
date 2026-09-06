# Migrating to your external Supabase project

Follow these steps in order. Each box is one action. Stop and fix errors before continuing.

## 0. Prerequisites

- [ ] Install the Supabase CLI: `npm i -g supabase` (or `brew install supabase/tap/supabase`).
- [ ] In your external Supabase dashboard → **Project Settings → General**: copy the **Project Ref**.
- [ ] **Project Settings → API**: copy Project URL, `anon`/publishable key, and `service_role` key (server-only).
- [ ] **Project Settings → Database**: copy the database password.

## 1. Link the repo to your external project

```bash
supabase login
supabase link --project-ref <your-external-ref>
```

You will be prompted for the database password.

> Note: `supabase/config.toml` currently has `project_id = "ivqxpoyqsiegrtygldsh"` (the Lovable Cloud project). `supabase link` will rewrite it to your external ref. That's fine — just don't commit the change back if you still want Lovable Cloud to work too.

## 2. Push all schema migrations

The 24 files in `supabase/migrations/` create:

- **Tables**: `profiles`, `transactions`, `transfers`, `transfer_restrictions`, `user_roles`, `app_settings`, `audit_logs`
- **Enum**: `app_role` (`admin`, `moderator`, `user`)
- **RLS policies + GRANTs** on every public table
- **RPC functions**: `has_role`, `generate_account_number`, `handle_new_user`, `update_updated_at_column`, `prevent_sensitive_profile_updates`, `lookup_account_by_number`, `adjust_own_balance`, `credit_account_by_number`, `execute_withdrawal`, `execute_transfer`, `admin_reset_user`, `admin_reset_user_by_account`, `admin_fund_account_by_number`
- **Triggers**: `on_auth_user_created` on `auth.users` → `handle_new_user`; `prevent_sensitive_profile_updates` on `profiles`
- **RPC lockdown**: revokes EXECUTE from `anon`/`authenticated` where appropriate (final migration)

Run:

```bash
supabase db push
```

- [ ] All migrations applied with no errors (`supabase migration list` shows every file as `Applied`).
- [ ] Dashboard → **Table Editor**: all 7 tables present.
- [ ] Dashboard → **Database → Functions**: all 13 RPCs present.
- [ ] Dashboard → **Database → Triggers**: `on_auth_user_created` exists on `auth.users`.

If a migration is reported as already applied (it isn't), run `supabase migration repair --status applied <timestamp>` and retry.

## 3. Create the storage bucket

The app uses one **private** bucket called `avatars`.

- [ ] **Storage → New bucket**: name `avatars`, **Public = OFF**.
- [ ] In **SQL Editor**, add policies on `storage.objects` (files are stored under `<user_id>/...`):

```sql
CREATE POLICY "avatars read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## 4. Configure Authentication

- [ ] **Auth → Providers → Email**: enabled. (Leave email confirmation ON for production.)
- [ ] **Auth → Providers → Google**: enable, paste Client ID + Secret. Add the callback URL Supabase shows you into your Google Cloud OAuth client.
- [ ] **Auth → URL Configuration**: set Site URL to your prod domain. Add dev/preview/prod URLs to Redirect URLs.
- [ ] **Auth → Providers → Email → Leaked Password Protection**: ON.
- [ ] Disable anonymous sign-ins.

## 5. Point the app at the new project

Update `.env` and your host's env vars:

```
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
VITE_SUPABASE_PROJECT_ID="<ref>"
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key>"   # server-only, NEVER commit
```

- [ ] Restart the dev server / redeploy.
- [ ] Sign up a fresh test user → a row appears in `public.profiles` with an account number, and a `user` row in `public.user_roles`.

## 6. Promote your first admin

After signing up your admin user, run in **SQL Editor**:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'you@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

## 7. Smoke test

- [ ] Log in.
- [ ] Visit `/admin` — admin portal loads.
- [ ] Fund a test account via admin UI; verify balance + transaction row.
- [ ] Run automated RLS checks:

```bash
SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun scripts/rls-check.ts
```

All assertions should pass.

---

Most common failure: migrations pushed out of order, or `db push` skipped because of a stale `supabase_migrations.schema_migrations` row. Use `supabase migration list` to diagnose.
