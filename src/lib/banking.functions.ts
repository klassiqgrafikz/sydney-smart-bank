import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records an incoming payment for the signed-in user. Performs the credit and
 * transaction insert atomically server-side so the client cannot adjust its
 * own balance directly. Per-call cap enforced to limit abuse.
 */
export const recordReceivedPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { senderName: string; senderAccount?: string; amount: number; reference?: string }) => {
    const senderName = String(input?.senderName ?? "").trim();
    const senderAccount = String(input?.senderAccount ?? "").trim();
    const amount = Number(input?.amount);
    const reference = String(input?.reference ?? "").trim();
    if (senderName.length < 1 || senderName.length > 100) throw new Error("Invalid sender name");
    if (senderAccount && !/^\d{6,20}$/.test(senderAccount)) throw new Error("Invalid sender account");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      throw new Error("Invalid amount (max 1,000,000)");
    }
    if (reference.length > 300) throw new Error("Reference too long");
    return { senderName, senderAccount, amount, reference };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, balance")
      .eq("id", context.userId)
      .single();
    if (pErr || !profile) throw new Error("Profile not found");

    const recipientName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    const newBalance = Number(profile.balance ?? 0) + data.amount;

    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", profile.id);
    if (uErr) throw new Error(uErr.message);

    const { data: tx, error: tErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: profile.id,
        sender_name: data.senderName,
        receiver_name: recipientName,
        amount: data.amount,
        transaction_type: "receive",
        description: data.reference,
      })
      .select("transaction_id, created_at")
      .single();
    if (tErr || !tx) throw new Error(tErr?.message ?? "Failed to record transaction");

    return {
      transactionId: tx.transaction_id as string,
      createdAt: tx.created_at as string,
      newBalance,
    };
  });