import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TransactionReceiptDialog, type ReceiptData } from "@/components/transaction-receipt-dialog";
import { TransferRestrictionGate } from "@/components/transfer-restriction-gate";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — Bank of Sydney" }] }),
  component: Withdraw,
});

function Withdraw() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > Number(profile.balance)) return toast.error("Insufficient balance");
    setLoading(true);
    const methodLabel = method === "bank" ? "Bank Transfer" : method === "cash" ? "Cash Pickup" : "International Withdrawal";
    const desc = `Withdrawal via ${methodLabel}`;
    const { data: wRes, error: wErr } = await supabase.rpc("execute_withdrawal", {
      _amount: amt,
      _description: desc,
    });
    if (wErr) { setLoading(false); return toast.error(wErr.message); }
    const wRow = Array.isArray(wRes) ? wRes[0] : wRes;
    const { data: tx } = await supabase
      .from("transactions")
      .select("transaction_id, created_at")
      .eq("id", wRow?.transaction_id)
      .single();
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Withdrawal successful");
    setReceipt({
      transactionId: tx?.transaction_id ?? "",
      transactionType: "withdraw",
      amount: amt,
      date: tx?.created_at ?? new Date().toISOString(),
      description: desc,
      extra: [{ label: "Method", value: methodLabel }],
    });
    setAmount("");
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Withdraw Funds</h1>
      <TransferRestrictionGate>
        <Card>
          <CardHeader><CardTitle>New withdrawal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount (USD)</Label>
              <Input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Withdrawal method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash Pickup</SelectItem>
                  <SelectItem value="international">International Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Withdraw</Button>
            </form>
          </CardContent>
        </Card>
      </TransferRestrictionGate>
      <TransactionReceiptDialog
        receipt={receipt}
        onClose={() => setReceipt(null)}
        title="Withdrawal Successful"
        subtitle="Your withdrawal request has been processed."
      />
    </div>
  );
}