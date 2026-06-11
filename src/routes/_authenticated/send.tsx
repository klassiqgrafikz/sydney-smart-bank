import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TransactionReceiptDialog, type ReceiptData } from "@/components/transaction-receipt-dialog";

export const Route = createFileRoute("/_authenticated/send")({
  head: () => ({ meta: [{ title: "Send Money — Bank of Sydney" }] }),
  component: SendMoney,
});

function SendMoney() {
  const [tab, setTab] = useState("domestic");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Send Money</h1>
      <Card>
        <CardHeader><CardTitle>New transfer</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="domestic">Domestic</TabsTrigger>
              <TabsTrigger value="international">International</TabsTrigger>
            </TabsList>
            <TabsContent value="domestic"><TransferForm type="domestic" onDone={setReceipt} /></TabsContent>
            <TabsContent value="international"><TransferForm type="international" onDone={setReceipt} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TransactionReceiptDialog
        receipt={receipt}
        onClose={() => setReceipt(null)}
        title="Transfer Successful"
        subtitle="Your funds are on the way."
      />
    </div>
  );
}

function TransferForm({ type, onDone }: { type: "domestic" | "international"; onDone: (r: ReceiptData) => void }) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    recipient_name: "", recipient_bank: "", account_number: "", amount: "", reference: "",
    country: "", swift_code: "", routing_number: "", iban: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amt = parseFloat(f.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > Number(profile.balance)) return toast.error("Insufficient balance");
    setLoading(true);

    const { error: tErr } = await supabase.from("transfers").insert({
      user_id: profile.id,
      transfer_type: type,
      recipient_name: f.recipient_name,
      recipient_bank: f.recipient_bank,
      account_number: f.account_number,
      amount: amt,
      reference: f.reference,
      country: type === "international" ? f.country : null,
      swift_code: type === "international" ? f.swift_code : null,
      routing_number: type === "international" ? f.routing_number : null,
      iban: type === "international" ? f.iban : null,
    });
    if (tErr) { setLoading(false); return toast.error(tErr.message); }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        user_id: profile.id,
        sender_name: `${profile.first_name} ${profile.last_name}`,
        receiver_name: f.recipient_name,
        amount: amt,
        transaction_type: "send",
        description: `${type === "domestic" ? "Domestic" : "International"} transfer — ${f.reference || "no reference"}`,
      })
      .select()
      .single();
    if (txErr || !tx) { setLoading(false); return toast.error(txErr?.message ?? "Failed"); }

    const { error: bErr } = await supabase.rpc("adjust_own_balance", { delta: -amt });
    if (bErr) { setLoading(false); return toast.error(bErr.message); }

    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Transfer successful");
    setLoading(false);
    onDone({
      transactionId: tx.transaction_id,
      transactionType: "send",
      amount: amt,
      date: tx.created_at,
      counterparty: f.recipient_name,
      counterpartyLabel: "Recipient",
      reference: f.reference,
      description: `${type === "domestic" ? "Domestic" : "International"} transfer`,
      extra: [
        { label: "Recipient Bank", value: f.recipient_bank },
        { label: "Account Number", value: f.account_number },
        ...(type === "international"
          ? [
              { label: "Country", value: f.country },
              { label: "SWIFT / BIC", value: f.swift_code },
              ...(f.routing_number ? [{ label: "Routing Number", value: f.routing_number }] : []),
              ...(f.iban ? [{ label: "IBAN", value: f.iban }] : []),
            ]
          : []),
      ],
    });
    setF({ recipient_name: "", recipient_bank: "", account_number: "", amount: "", reference: "", country: "", swift_code: "", routing_number: "", iban: "" });
  };

  return (
    <form onSubmit={submit} className="space-y-4 pt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Recipient name" v={f.recipient_name} onChange={set("recipient_name")} required />
        <Field label="Bank name" v={f.recipient_bank} onChange={set("recipient_bank")} required />
        {type === "international" && <Field label="Country" v={f.country} onChange={set("country")} required />}
        {type === "international" && <Field label="SWIFT / BIC" v={f.swift_code} onChange={set("swift_code")} required />}
        {type === "international" && <Field label="Routing number" v={f.routing_number} onChange={set("routing_number")} />}
        {type === "international" && <Field label="IBAN" v={f.iban} onChange={set("iban")} />}
        <Field label="Account number" v={f.account_number} onChange={set("account_number")} required />
        <Field label="Amount (USD)" v={f.amount} onChange={set("amount")} type="number" required />
        <div className="md:col-span-2"><Field label="Reference" v={f.reference} onChange={set("reference")} placeholder="e.g. Invoice #2412" /></div>
      </div>
      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send transfer
      </Button>
    </form>
  );
}

function Field({ label, v, onChange, type = "text", required, placeholder }: { label: string; v: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={onChange} required={required} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} />
    </div>
  );
}