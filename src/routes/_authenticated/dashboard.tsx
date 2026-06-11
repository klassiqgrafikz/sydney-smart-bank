import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useBrand } from "@/hooks/use-brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff, Send, Download, Banknote, ArrowUpRight, ArrowDownLeft, Wallet, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { CopyAccountNumber } from "@/components/copy-account-number";
import { TransactionDetailsDialog } from "@/components/transaction-details-dialog";
import { LiveSupport } from "@/components/live-support";
import {
  CashFlowWidget,
  SpendingBreakdownWidget,
  SavingsGoalWidget,
  ExchangeRatesWidget,
} from "@/components/dashboard-widgets";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bank of Sydney" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile, isLoading } = useProfile();
  const brand = useBrand();
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const { data: txs } = useQuery({
    queryKey: ["recent-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {profile?.last_name || profile?.first_name || "Customer"}
        </h1>
        <p className="text-sm text-muted-foreground">Here's a snapshot of your account today.</p>
      </div>

      <Card className="overflow-hidden border-0 text-white" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Account Number</p>
              <div className="mt-1 text-lg">
                {isLoading ? <Skeleton className="h-6 w-44 bg-white/20" /> : <CopyAccountNumber value={profile?.account_number} className="text-white" />}
              </div>
            </div>
            <Badge className="bg-white/15 text-white hover:bg-white/20"><ShieldCheck className="mr-1 h-3 w-3" /> {profile?.account_status ?? "active"}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60">Available Balance</p>
            <div className="mt-1 flex items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-10 w-48 bg-white/20" />
              ) : (
                <p className="text-4xl font-bold">
                  {showBalance ? formatCurrency(profile?.balance ?? 0) : "••••••"}
                </p>
              )}
              <button onClick={() => setShowBalance((v) => !v)} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { to: "/send", icon: Send, label: "Send", desc: "Transfer worldwide" },
          { to: "/receive", icon: Download, label: "Receive", desc: "Log incoming funds" },
          { to: "/withdraw", icon: Banknote, label: "Withdraw", desc: "Cash or transfer" },
        ].map((q) => (
          <Link key={q.label} to={q.to}>
            <Card className="group cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <q.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{q.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CashFlowWidget />

      <div className="grid gap-4 md:grid-cols-3">
        <SavingsGoalWidget balance={Number(profile?.balance ?? 0)} />
        <SpendingBreakdownWidget />
        <ExchangeRatesWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link to="/transactions" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!txs ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : txs.length === 0 ? (
              <div className="grid place-items-center py-10 text-center text-sm text-muted-foreground">
                <Wallet className="mb-2 h-8 w-8 opacity-30" />
                No transactions yet
              </div>
            ) : (
              <div className="divide-y">
                {txs.map((t) => {
                  const incoming = ["receive", "credit"].includes(t.transaction_type);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTx(t)}
                      className="flex w-full items-center justify-between rounded-md py-3 text-left transition hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`grid h-9 w-9 place-items-center rounded-full ${incoming ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                          {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{t.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">{t.description ?? t.receiver_name ?? t.sender_name ?? "—"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${incoming ? "text-emerald-600" : "text-foreground"}`}>
                          {incoming ? "+" : "-"}{formatCurrency(t.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status" value={<Badge variant="secondary" className="capitalize">{profile?.account_status ?? "—"}</Badge>} />
            <Row label="Last login" value={formatDate(new Date())} />
            <Row label="Email" value={profile?.email ?? "—"} />
            <Row label="Country" value={profile?.country ?? "—"} />
          </CardContent>
        </Card>
      </div>
      <TransactionDetailsDialog tx={selectedTx} open={!!selectedTx} onOpenChange={(v) => !v && setSelectedTx(null)} />
      <LiveSupport hideEmail />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}