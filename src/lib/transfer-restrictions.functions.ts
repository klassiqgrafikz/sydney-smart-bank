import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: isAdmin, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden: admin only");
  return supabaseAdmin;
}

export const setTransferRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      accountNumber: string;
      restoreDate?: string;
      statusText?: string;
      message?: string;
    }) => {
      const accountNumber = String(input.accountNumber ?? "").trim();
      const restoreDate = input.restoreDate ? String(input.restoreDate).trim() : null;
      const statusText = String(input.statusText ?? "").trim().slice(0, 200);
      const message = String(input.message ?? "").trim().slice(0, 1000);
      if (!/^\d{6,20}$/.test(accountNumber)) throw new Error("Invalid account number");
      if (restoreDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(restoreDate)) throw new Error("Invalid restore date");
      return { accountNumber, restoreDate, statusText, message };
    },
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("account_number", data.accountNumber)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Account not found");
    const { error } = await supabaseAdmin
      .from("transfer_restrictions")
      .upsert(
        {
          account_number: data.accountNumber,
          restore_date: data.restoreDate,
          status_text: data.statusText,
          message: data.message,
          created_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_number" },
      );
    if (error) throw new Error(error.message);
    return {
      ok: true,
      holder: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    };
  });

export const clearTransferRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountNumber: string }) => {
    const accountNumber = String(input.accountNumber ?? "").trim();
    if (!/^\d{6,20}$/.test(accountNumber)) throw new Error("Invalid account number");
    return { accountNumber };
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("transfer_restrictions")
      .delete()
      .eq("account_number", data.accountNumber);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTransferRestrictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("transfer_restrictions")
      .select("account_number, restore_date, status_text, message, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });