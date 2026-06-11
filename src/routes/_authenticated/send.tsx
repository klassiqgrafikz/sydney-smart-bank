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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/send")({
  head: () => ({ meta: [{ title: "Send Money — Bank of Sydney" }] }),
  component: SendMoney,
});

interface Receipt {
  recipient: string; amount: number; reference: string; tx_id: string; date: string;
}

function SendMoney() {
  const [tab, setTab] = useState("domestic");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

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

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Transfer Successful</DialogTitle>
            <DialogDescription className="text-center">Your funds are on the way.</DialogDescription>
          </DialogHeader>
          {receipt && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
              <Row k="Recipient" v={receipt.recipient} />
              <Row k="Amount" v={formatCurrency(receipt.amount)} />
              <Row k="Reference" v={receipt.reference || "—"} />
              <Row k="Transaction ID" v={<span className="font-mono text-xs">{receipt.tx_id}</span>} />
              <Row k="Date" v={formatDate(receipt.date)} />
            </div>
          )}
          <DialogFooter><Button onClick={() => setReceipt(null)} className="w-full">Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

function TransferForm({ type, onDone }: { type: "domestic" | "international"; onDone: (r: Receipt) => void }) {
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

    const { error: bErr } = await supabase
      .from("profiles").update({ balance: Number(profile.balance) - amt }).eq("id", profile.id);
    if (bErr) { setLoading(false); return toast.error(bErr.message); }

    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["recent-tx"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Transfer successful");
    setLoading(false);
    onDone({ recipient: f.recipient_name, amount: amt, reference: f.reference, tx_id: tx.transaction_id, date: tx.created_at });
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