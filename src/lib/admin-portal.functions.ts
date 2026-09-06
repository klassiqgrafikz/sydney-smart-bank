import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminFundAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountNumber: string; amount: number; senderName: string; occurredAt?: string | null }) => {
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
    let occurredAt: string | null = null;
    if (input.occurredAt) {
      const d = new Date(input.occurredAt);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time");
      occurredAt = d.toISOString();
    }
    return { accountNumber, amount, senderName, occurredAt };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin, error: rErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { data: result, error: fErr } = await supabaseAdmin.rpc(
      "admin_fund_account_by_number",
      {
        _caller_id: context.userId,
        _account_number: data.accountNumber,
        _amount: data.amount,
        _sender_name: data.senderName,
        _occurred_at: data.occurredAt ?? undefined,
      },
    );
    if (fErr) throw new Error(fErr.message);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error("Funding failed");

    return {
      ok: true,
      accountNumber: row.account_number,
      holder: row.holder,
      newBalance: Number(row.new_balance),
      transactionId: String(row.transaction_id),
    };
  });