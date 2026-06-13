import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { recordReceivedPayment } from "@/lib/banking.functions";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { CopyAccountNumber, getAccountHolderName } from "@/components/copy-account-number";
import { useBrand } from "@/hooks/use-brand";
import { TransactionReceiptDialog, type ReceiptData } from "@/components/transaction-receipt-dialog";
import { TransferRestrictionGate } from "@/components/transfer-restriction-gate";

export const Route = createFileRoute("/_authenticated/receive")({
  head: () => ({ meta: [{ title: "Receive Money — Bank of Sydney" }] }),
  component: Receive,
});

function Receive() {
  const { data: profile } = useProfile();
  const brand = useBrand();
  const qc = useQueryClient();
  const [f, setF] = useState({ sender: "", sender_account: "", amount: "", reference: "" });
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [lookup, setLookup] = useState<{ status: "idle" | "searching" | "found" | "not_found" }>({ status: "idle" });
  const lookupSeq = useRef(0);
  const record = useServerFn(recordReceivedPayment);

  useEffect(() => {
    const acct = f.sender_account.trim();
    if (acct.length < 8) { setLookup({ status: "idle" }); return; }
    const seq = ++lookupSeq.current;
    setLookup({ status: "searching" });
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("lookup_account_by_number", { _account_number: acct });
      if (seq !== lookupSeq.current) return;
      const hit = Array.isArray(data) ? data[0] : null;
      if (error || !hit) { setLookup({ status: "not_found" }); return; }
      setLookup({ status: "found" });
      setF((p) => ({ ...p, sender: hit.full_name ?? p.sender }));
    }, 350);
    return () => clearTimeout(t);
  }, [f.sender_account]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    let res;
    try {
      res = await record({
        data: {
          senderName: f.sender,
          senderAccount: f.sender_account.trim() || undefined,
          amount: amt,
          reference: f.reference,
        },
      });
    } catch (err) {
      setLoading(false);
      return toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Failed");
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Funds received");
    setReceipt({
      transactionId: res.transactionId,
      transactionType: "receive",
      amount: amt,
      date: res.createdAt,
      counterparty: f.sender,
      counterpartyLabel: "Sender",
      reference: f.reference,
    });
    setF({ sender: "", sender_account: "", amount: "", reference: "" });
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

      <TransferRestrictionGate>
        <Card>
          <CardHeader>
            <CardTitle>Log incoming payment</CardTitle>
            <CardDescription>Record a payment you've received.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sender account number</Label>
              <Input value={f.sender_account} onChange={(e) => setF({ ...f, sender_account: e.target.value })} placeholder="Type to auto-fill name" />
              {lookup.status === "searching" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Looking up customer…</p>
              )}
              {lookup.status === "found" && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Customer found — name auto-filled</p>
              )}
              {lookup.status === "not_found" && (
                <p className="flex items-center gap-1.5 text-xs text-destructive"><XCircle className="h-3 w-3" /> No customer with this account number</p>
              )}
            </div>
            <div className="space-y-1.5"><Label>Sender name</Label><Input required value={f.sender} onChange={(e) => setF({ ...f, sender: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Amount (USD)</Label><Input required type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reference</Label><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
              <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm receipt</Button>
            </form>
          </CardContent>
        </Card>
      </TransferRestrictionGate>
      <TransactionReceiptDialog
        receipt={receipt}
        onClose={() => setReceipt(null)}
        title="Funds Received"
        subtitle="Incoming payment recorded successfully."
      />
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