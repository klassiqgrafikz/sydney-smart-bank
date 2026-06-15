#!/usr/bin/env bash
# End-to-end migration of this project's schema, RPCs, triggers, and storage
# into an EXTERNAL Supabase project.
#
# Usage:
#   EXTERNAL_PROJECT_REF=abcd1234 \
#   EXTERNAL_DB_PASSWORD='...' \
#   EXTERNAL_SUPABASE_URL='https://abcd1234.supabase.co' \
#   EXTERNAL_ANON_KEY='...' \
#   EXTERNAL_SERVICE_ROLE_KEY='...' \
#   ADMIN_EMAIL='you@example.com' \
#   bash scripts/migrate-external-supabase.sh
#
# Optional:
#   SKIP_RLS_CHECK=1   # don't run scripts/rls-check.ts at the end
#   SKIP_LINK=1        # assume `supabase link` already done
set -euo pipefail

require() { [ -n "${!1:-}" ] || { echo "✗ missing env: $1" >&2; exit 2; }; }
require EXTERNAL_PROJECT_REF
require EXTERNAL_DB_PASSWORD
require EXTERNAL_SUPABASE_URL
require EXTERNAL_ANON_KEY
require EXTERNAL_SERVICE_ROLE_KEY
require ADMIN_EMAIL

command -v supabase >/dev/null || { echo "✗ supabase CLI not installed (npm i -g supabase)"; exit 2; }
command -v psql >/dev/null      || { echo "✗ psql not installed"; exit 2; }
command -v curl >/dev/null      || { echo "✗ curl not installed"; exit 2; }

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }

step "1/6  Linking project ($EXTERNAL_PROJECT_REF)"
if [ -z "${SKIP_LINK:-}" ]; then
  SUPABASE_DB_PASSWORD="$EXTERNAL_DB_PASSWORD" \
    supabase link --project-ref "$EXTERNAL_PROJECT_REF"
fi

step "2/6  Pushing all migrations in supabase/migrations/"
SUPABASE_DB_PASSWORD="$EXTERNAL_DB_PASSWORD" supabase db push

DB_URL="postgresql://postgres.${EXTERNAL_PROJECT_REF}:${EXTERNAL_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
# Try pooler first; fall back to direct if PSQL fails.
psql_run() {
  PGPASSWORD="$EXTERNAL_DB_PASSWORD" psql "$DB_URL" -v ON_ERROR_STOP=1 "$@" 2>/dev/null \
    || PGPASSWORD="$EXTERNAL_DB_PASSWORD" psql \
         "postgresql://postgres:${EXTERNAL_DB_PASSWORD}@db.${EXTERNAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require" \
         -v ON_ERROR_STOP=1 "$@"
}

step "3/6  Creating storage bucket 'avatars' (private) + policies"
curl -fsS -X POST "$EXTERNAL_SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $EXTERNAL_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $EXTERNAL_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"avatars","name":"avatars","public":false}' \
  >/dev/null || echo "  (bucket already exists — continuing)"

psql_run <<'SQL'
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars read own') then
    create policy "avatars read own" on storage.objects for select to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars upload own') then
    create policy "avatars upload own" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars update own') then
    create policy "avatars update own" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars delete own') then
    create policy "avatars delete own" on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
SQL

step "4/6  Verifying schema (tables + RPCs + trigger)"
psql_run -A -t <<'SQL'
\echo Tables:
select string_agg(table_name, ', ' order by table_name)
  from information_schema.tables
 where table_schema='public'
   and table_name in ('profiles','transactions','transfers','transfer_restrictions','user_roles','app_settings','audit_logs');
\echo Functions:
select count(*) || ' RPCs found'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and p.proname in ('has_role','generate_account_number','handle_new_user','update_updated_at_column',
                     'prevent_sensitive_profile_updates','lookup_account_by_number','adjust_own_balance',
                     'credit_account_by_number','execute_withdrawal','execute_transfer',
                     'admin_reset_user','admin_reset_user_by_account','admin_fund_account_by_number');
\echo Auth trigger:
select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
SQL

step "5/6  Promoting $ADMIN_EMAIL to admin (no-op if user doesn't exist yet)"
PGPASSWORD="$EXTERNAL_DB_PASSWORD" psql_run -v admin_email="$ADMIN_EMAIL" <<'SQL'
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users where email = :'admin_email'
on conflict (user_id, role) do nothing;
select count(*) || ' admin role(s) for ' || :'admin_email'
  from public.user_roles ur join auth.users u on u.id=ur.user_id
 where u.email = :'admin_email' and ur.role='admin';
SQL

step "6/6  Updating .env with external project values"
ENV_FILE=".env"
touch "$ENV_FILE"
set_env() {
  local k="$1" v="$2"
  if grep -qE "^${k}=" "$ENV_FILE"; then
    # portable in-place edit
    awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $1==k{$0=k"=\""v"\""} {print}' "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  else
    printf '%s="%s"\n' "$k" "$v" >> "$ENV_FILE"
  fi
}
set_env VITE_SUPABASE_URL              "$EXTERNAL_SUPABASE_URL"
set_env VITE_SUPABASE_PUBLISHABLE_KEY  "$EXTERNAL_ANON_KEY"
set_env VITE_SUPABASE_PROJECT_ID       "$EXTERNAL_PROJECT_REF"
set_env SUPABASE_URL                   "$EXTERNAL_SUPABASE_URL"
set_env SUPABASE_PUBLISHABLE_KEY       "$EXTERNAL_ANON_KEY"
set_env SUPABASE_SERVICE_ROLE_KEY      "$EXTERNAL_SERVICE_ROLE_KEY"
echo "  .env updated. Service role key is server-only — do NOT commit .env."

if [ -z "${SKIP_RLS_CHECK:-}" ] && command -v bun >/dev/null; then
  step "Bonus  Running scripts/rls-check.ts against the new project"
  SUPABASE_URL="$EXTERNAL_SUPABASE_URL" \
  SUPABASE_PUBLISHABLE_KEY="$EXTERNAL_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$EXTERNAL_SERVICE_ROLE_KEY" \
    bun scripts/rls-check.ts
fi

printf "\n\033[1;32m✓ Migration complete.\033[0m Next: in the Supabase dashboard enable Google OAuth, set Site URL + redirect URLs, and turn on leaked-password protection.\n"
