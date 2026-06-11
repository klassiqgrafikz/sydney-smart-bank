import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CopyAccountNumber, getAccountHolderName } from "@/components/copy-account-number";
import { useBrand } from "@/hooks/use-brand";

export const Route = createFileRoute("/_authenticated/receive")({
  head: () => ({ meta: [{ title: "Receive Money — Bank of Sydney" }] }),
  component: Receive,
});

function Receive() {
  const { data: profile } = useProfile();
  const brand = useBrand();
  const qc = useQueryClient();
  const [f, setF] = useState({ sender: "", amount: "", reference: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: profile.id, sender_name: f.sender, receiver_name: `${profile.first_name} ${profile.last_name}`,
      amount: amt, transaction_type: "receive", description: f.reference,
    });
    if (txErr) { setLoading(false); return toast.error(txErr.message); }
    const { error: bErr } = await supabase.from("profiles")
      .update({ balance: Number(profile.balance) + amt }).eq("id", profile.id);
    if (bErr) { setLoading(false); return toast.error(bErr.message); }
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Funds received");
    setF({ sender: "", amount: "", reference: "" });
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Receive Money</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your receiving details</CardTitle>
          <CardDescription>Share these with the sender.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Detail k="Account holder" v={getAccountHolderName(profile)} />
          <Detail k="Account number" v={<CopyAccountNumber value={profile?.account_number} />} />
          <Detail k="Bank" v={brand.bankName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log incoming payment</CardTitle>
          <CardDescription>Record a payment you've received.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label>Sender name</Label><Input required value={f.sender} onChange={(e) => setF({ ...f, sender: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Amount (USD)</Label><Input required type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reference</Label><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm receipt</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="mt-1 font-medium">{v}</p>
    </div>
  );
}