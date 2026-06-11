import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure the signed-in user has a complete profile row.
 * - Creates the row if missing (e.g. legacy users or OAuth signups without trigger metadata).
 * - Fills in any blank required fields (email, first/last name, account_number) when possible.
 */
export async function ensureProfile(user: User): Promise<void> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaFirst = (meta.first_name as string) ?? (meta.given_name as string) ?? "";
  const metaLast = (meta.last_name as string) ?? (meta.family_name as string) ?? "";
  const metaPhone = (meta.phone as string) ?? null;
  const metaCountry = (meta.country as string) ?? null;

  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, country, account_number")
    .eq("id", user.id)
    .maybeSingle();
  if (selErr) return;

  if (!existing) {
    const { data: acct } = await supabase.rpc("generate_account_number");
    const account_number =
      (acct as string | null) ?? String(Math.floor(Math.random() * 1e15)).padStart(15, "0");
    await supabase.from("profiles").insert({
      id: user.id,
      first_name: metaFirst,
      last_name: metaLast,
      email: user.email ?? "",
      phone: metaPhone,
      country: metaCountry,
      account_number,
    });
    return;
  }

  const patch: Record<string, string> = {};
  if (!existing.email && user.email) patch.email = user.email;
  if (!existing.first_name && metaFirst) patch.first_name = metaFirst;
  if (!existing.last_name && metaLast) patch.last_name = metaLast;
  if (!existing.phone && metaPhone) patch.phone = metaPhone;
  if (!existing.country && metaCountry) patch.country = metaCountry;
  if (!existing.account_number) {
    const { data: acct } = await supabase.rpc("generate_account_number");
    if (acct) patch.account_number = acct as string;
  }
  if (Object.keys(patch).length > 0) {
    await supabase.from("profiles").update(patch as never).eq("id", user.id);
  }
}