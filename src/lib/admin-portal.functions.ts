import { createServerFn } from "@tanstack/react-start";

const ADMIN_CODE = "1975";

export const adminFundAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; accountNumber: string; amount: number; senderName: string }) => {
    if (!input || typeof input.code !== "string") throw new Error("Invalid request");
    const accountNumber = String(input.accountNumber ?? "").trim();
    const amount = Number(input.amount);
    const senderName = String(input.senderName ?? "").trim();
    if (!/^\d{6,20}$/.test(accountNumber)) throw new Error("Invalid account number");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      throw new Error("Invalid amount");
    }
    if (senderName.length < 1 || senderName.length > 100) {
      throw new Error("Invalid sender name");
    }
    return { code: input.code, accountNumber, amount, senderName };
  })
  .handler(async ({ data }) => {
    if (data.code !== ADMIN_CODE) {
      throw new Error("Invalid access code");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, balance, account_number")
      .eq("account_number", data.accountNumber)
      .maybeSingle();

    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Account not found");

    const newBalance = Number(profile.balance ?? 0) + data.amount;
    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", profile.id);
    if (uErr) throw new Error(uErr.message);

    const txId = "ADM-" + Date.now().toString(36).toUpperCase();
    const { error: tErr } = await supabaseAdmin.from("transactions").insert({
      transaction_id: txId,
      user_id: profile.id,
      sender_name: data.senderName,
      receiver_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Account holder",
      amount: data.amount,
      transaction_type: "credit",
      description: "Admin deposit",
      status: "completed",
    });
    if (tErr) throw new Error(tErr.message);

    return {
      ok: true,
      accountNumber: profile.account_number,
      holder: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      newBalance,
      transactionId: txId,
    };
  });