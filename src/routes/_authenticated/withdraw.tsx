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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > Number(profile.balance)) return toast.error("Insufficient balance");
    setLoading(true);
    const desc = `Withdrawal via ${method === "bank" ? "Bank Transfer" : method === "cash" ? "Cash Pickup" : "International Withdrawal"}`;
    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: profile.id, amount: amt, transaction_type: "withdraw",
      description: desc, sender_name: `${profile.first_name} ${profile.last_name}`,
    });
    if (txErr) { setLoading(false); return toast.error(txErr.message); }
    const { error: bErr } = await supabase.from("profiles")
      .update({ balance: Number(profile.balance) - amt }).eq("id", profile.id);
    if (bErr) { setLoading(false); return toast.error(bErr.message); }
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Withdrawal successful");
    setAmount("");
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Withdraw Funds</h1>
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
    </div>
  );
}