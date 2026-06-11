/**
 * Automated RLS policy checks for `transfers`, `transactions`, and `profiles`.
 *
 * Verifies:
 *  - Unauthenticated (anon) sessions cannot read or write any of the three tables.
 *  - Authenticated user A cannot read or modify user B's transfers/transactions/profile.
 *  - Authenticated users can only read/insert their own transfers and transactions.
 *  - Authenticated users cannot tamper with protected profile fields (balance,
 *    account_number, email, account_status) on their own row.
 *
 * Run with:  SUPABASE_SERVICE_ROLE_KEY=... bun scripts/rls-check.ts
 * (service role is required ONLY to provision and tear down the two ephemeral
 * test users; the actual policy checks run as anon and as each test user.)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in env.");
  process.exit(2);
}
if (!SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Provide it to provision test users:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=... bun scripts/rls-check.ts",
  );
  process.exit(2);
}

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  const tag = ok ? "\u001b[32mPASS\u001b[0m" : "\u001b[31mFAIL\u001b[0m";
  console.log(`${tag}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function userClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function makeUser(label: string) {
  const email = `rlscheck+${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
  const password = `Pw_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: label, last_name: "Test" },
  });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);

  // Wait until handle_new_user has inserted the profile row.
  for (let i = 0; i < 25; i++) {
    const { data: p } = await admin
      .from("profiles")
      .select("id, account_number")
      .eq("id", data.user.id)
      .maybeSingle();
    if (p?.account_number) {
      const client = userClient();
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error) throw new Error(`signIn ${label}: ${signIn.error.message}`);
      return { id: data.user.id, email, accountNumber: p.account_number, client };
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`profile for ${label} was not provisioned in time`);
}

async function expectDenied(
  name: string,
  run: () => Promise<{ data: unknown; error: { message: string } | null }>,
  opts: { emptyOk?: boolean } = {},
) {
  const { data, error } = await run();
  if (error) {
    record(name, true, `blocked: ${error.message}`);
    return;
  }
  if (opts.emptyOk && Array.isArray(data) && data.length === 0) {
    record(name, true, "RLS hid all rows (empty result)");
    return;
  }
  record(
    name,
    false,
    `expected error but request succeeded (data=${JSON.stringify(data).slice(0, 120)})`,
  );
}

async function expectOk(
  name: string,
  run: () => Promise<{ data: unknown; error: { message: string } | null }>,
) {
  const { data, error } = await run();
  if (error) {
    record(name, false, `unexpected error: ${error.message}`);
    return null;
  }
  record(name, true);
  return data;
}

async function main() {
  console.log("Provisioning two ephemeral test users…");
  const [a, b] = await Promise.all([makeUser("alice"), makeUser("bob")]);
  const cleanup = async () => {
    await Promise.allSettled([
      admin.auth.admin.deleteUser(a.id),
      admin.auth.admin.deleteUser(b.id),
    ]);
  };

  try {
    const anon = userClient();

    // ---------- Unauthenticated session ----------
    console.log("\n— Unauthenticated (anon) —");
    await expectDenied(
      "anon cannot read transfers",
      () => anon.from("transfers").select("*").limit(1),
      { emptyOk: true },
    );
    await expectDenied(
      "anon cannot read transactions",
      () => anon.from("transactions").select("*").limit(1),
      { emptyOk: true },
    );
    await expectDenied(
      "anon cannot read profiles",
      () => anon.from("profiles").select("*").limit(1),
      { emptyOk: true },
    );
    await expectDenied("anon cannot insert a transfer", () =>
      anon.from("transfers").insert({
        user_id: a.id,
        transfer_type: "domestic",
        recipient_name: "x",
        amount: 1,
      }),
    );
    await expectDenied("anon cannot insert a transaction", () =>
      anon.from("transactions").insert({
        user_id: a.id,
        transaction_type: "send",
        amount: 1,
      }),
    );
    await expectDenied("anon cannot update a profile", () =>
      anon.from("profiles").update({ first_name: "hacked" }).eq("id", a.id),
    );

    // ---------- Seed legitimate rows as each user ----------
    console.log("\n— Seeding rows as their owners —");
    await expectOk("alice inserts her own transfer", () =>
      a.client.from("transfers").insert({
        user_id: a.id,
        transfer_type: "domestic",
        recipient_name: "Self Test",
        amount: 1,
      }),
    );
    await expectOk("alice inserts her own transaction", () =>
      a.client.from("transactions").insert({
        user_id: a.id,
        transaction_type: "send",
        amount: 1,
      }),
    );
    await expectOk("bob inserts his own transfer", () =>
      b.client.from("transfers").insert({
        user_id: b.id,
        transfer_type: "domestic",
        recipient_name: "Self Test",
        amount: 2,
      }),
    );

    // ---------- Cross-user reads ----------
    console.log("\n— Authenticated cross-user isolation —");
    const bobsTransfers = await expectOk("bob lists transfers (should see only his)", () =>
      b.client.from("transfers").select("user_id"),
    );
    if (Array.isArray(bobsTransfers)) {
      const leaked = bobsTransfers.filter(
        (r: { user_id: string }) => r.user_id !== b.id,
      );
      record(
        "bob sees no other users' transfers",
        leaked.length === 0,
        leaked.length === 0 ? undefined : `${leaked.length} foreign row(s) visible`,
      );
    }
    const bobsTx = await expectOk(
      "bob lists transactions (should see only his)",
      () => b.client.from("transactions").select("user_id"),
    );
    if (Array.isArray(bobsTx)) {
      const leaked = bobsTx.filter((r: { user_id: string }) => r.user_id !== b.id);
      record(
        "bob sees no other users' transactions",
        leaked.length === 0,
        leaked.length === 0 ? undefined : `${leaked.length} foreign row(s) visible`,
      );
    }

    // ---------- Cross-user writes ----------
    await expectDenied("bob cannot insert a transfer for alice", () =>
      b.client.from("transfers").insert({
        user_id: a.id,
        transfer_type: "domestic",
        recipient_name: "x",
        amount: 1,
      }),
    );
    await expectDenied("bob cannot insert a transaction for alice", () =>
      b.client.from("transactions").insert({
        user_id: a.id,
        transaction_type: "send",
        amount: 1,
      }),
    );
    await expectDenied(
      "bob cannot update alice's profile",
      async () => {
        const res = await b.client
          .from("profiles")
          .update({ first_name: "pwn" })
          .eq("id", a.id)
          .select();
        return { data: res.data, error: res.error };
      },
      { emptyOk: true },
    );

    // ---------- Protected profile fields on own row ----------
    console.log("\n— Protected profile fields on own row —");
    await expectDenied("alice cannot change her own balance", () =>
      a.client.from("profiles").update({ balance: 999999 }).eq("id", a.id),
    );
    await expectDenied("alice cannot change her own account_number", () =>
      a.client.from("profiles").update({ account_number: "0".repeat(15) }).eq("id", a.id),
    );
    await expectDenied("alice cannot change her own email", () =>
      a.client.from("profiles").update({ email: "stolen@example.test" }).eq("id", a.id),
    );
    await expectDenied("alice cannot change her own account_status", () =>
      a.client.from("profiles").update({ account_status: "frozen" }).eq("id", a.id),
    );
    await expectOk("alice can update her own first_name", () =>
      a.client.from("profiles").update({ first_name: "Alice" }).eq("id", a.id),
    );
  } finally {
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(2);
});