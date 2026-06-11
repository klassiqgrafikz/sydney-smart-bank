import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { generateStatementPDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/statements")({
  head: () => ({ meta: [{ title: "Statements — Bank of Sydney" }] }),
  component: Statements,
});

function Statements() {
  const { data: profile } = useProfile();
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (!profile) return;
    setLoading(true);
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });
    if (error) { setLoading(false); return toast.error(error.message); }

    const txs = data ?? [];
    const closing = Number(profile.balance);
    const net = txs.reduce((s, t) => {
      const sign = ["receive", "credit"].includes(t.transaction_type) ? 1 : -1;
      return s + sign * Number(t.amount);
    }, 0);
    const opening = closing - net;

    generateStatementPDF({
      customerName: `${profile.first_name} ${profile.last_name}`.trim() || profile.email,
      accountNumber: profile.account_number,
      periodStart: start,
      periodEnd: end,
      openingBalance: opening,
      closingBalance: closing,
      transactions: txs.map((t) => ({
        created_at: t.created_at,
        transaction_id: t.transaction_id,
        transaction_type: t.transaction_type,
        description: t.description,
        amount: Number(t.amount),
        status: t.status,
      })),
    });
    toast.success("Statement downloaded");
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Statements</h1>
      <Card>
        <CardHeader>
          <CardTitle>Download statement</CardTitle>
          <CardDescription>Generate a PDF for any date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <Button onClick={download} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}