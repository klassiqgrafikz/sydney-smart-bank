import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { CreditCard, TrendingUp, TrendingDown, Target, Wifi, PiggyBank, Receipt, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Profile } from "@/hooks/use-profile";

interface Tx {
  id: string;
  amount: number | string;
  transaction_type: string;
  created_at: string;
}

const INCOMING = new Set(["receive", "credit", "deposit"]);

function useAllTransactions() {
  return useQuery({
    queryKey: ["dashboard-all-tx"],
    queryFn: async (): Promise<Tx[]> => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, transaction_type, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      return (data ?? []) as Tx[];
    },
  });
}

export function VirtualCardWidget({ profile }: { profile?: Profile | null }) {
  const last4 = profile?.account_number?.slice(-4) ?? "0000";
  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim().toUpperCase() || "SYDNEY TRUST";
  return (
    <Card className="overflow-hidden border-0 text-white shadow-xl">
      <div
        className="relative aspect-[1.586/1] p-5"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, hsl(220 90% 60% / 0.9), transparent 50%), radial-gradient(100% 100% at 100% 100%, hsl(280 80% 45% / 0.9), transparent 60%), linear-gradient(135deg, hsl(225 60% 18%), hsl(240 50% 10%))",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Sydney Trust</p>
            <p className="text-sm font-semibold">Platinum Debit</p>
          </div>
          <Wifi className="h-5 w-5 rotate-90 text-white/80" />
        </div>
        <div className="mt-6 h-9 w-12 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500/70 shadow-inner" />
        <p className="mt-4 font-mono text-lg tracking-[0.25em] text-white/90">
          •••• •••• •••• {last4}
        </p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/50">Card Holder</p>
            <p className="truncate text-xs font-medium">{name}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-white/50">Valid Thru</p>
            <p className="text-xs font-medium">12/29</p>
          </div>
          <CreditCard className="h-7 w-7 text-white/80" />
        </div>
      </div>
    </Card>
  );
}

export function CashFlowWidget() {
  const { data: txs, isLoading } = useAllTransactions();

  const series = useMemo(() => {
    const buckets = new Map<string, { month: string; income: number; expense: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, {
        month: d.toLocaleString("en-US", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    (txs ?? []).forEach((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (!b) return;
      const amt = Number(t.amount) || 0;
      if (INCOMING.has(t.transaction_type)) b.income += amt;
      else b.expense += amt;
    });
    return Array.from(buckets.values());
  }, [txs]);

  const totalIn = series.reduce((s, m) => s + m.income, 0);
  const totalOut = series.reduce((s, m) => s + m.expense, 0);
  const net = totalIn - totalOut;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Cash Flow · 6M</CardTitle>
        <Badge variant={net >= 0 ? "secondary" : "destructive"} className="gap-1">
          {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatCurrency(net)}
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 70% 45%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(152 70% 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 75% 60%)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(0 75% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(152 70% 45%)" strokeWidth={2} fill="url(#inFill)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="hsl(0 75% 60%)" strokeWidth={2} fill="url(#outFill)" name="Expense" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SpendingBreakdownWidget() {
  const { data: txs, isLoading } = useAllTransactions();

  const slices = useMemo(() => {
    const acc = new Map<string, number>();
    (txs ?? []).forEach((t) => {
      if (INCOMING.has(t.transaction_type)) return;
      acc.set(t.transaction_type, (acc.get(t.transaction_type) ?? 0) + (Number(t.amount) || 0));
    });
    return Array.from(acc.entries()).map(([name, value]) => ({ name, value }));
  }, [txs]);

  const COLORS = ["hsl(220 90% 60%)", "hsl(280 70% 55%)", "hsl(340 80% 60%)", "hsl(35 90% 55%)", "hsl(170 70% 45%)"];
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-44 w-full" />
        ) : slices.length === 0 ? (
          <div className="grid h-44 place-items-center text-center text-sm text-muted-foreground">
            <div>
              <Receipt className="mx-auto mb-2 h-8 w-8 opacity-30" />
              No outgoing activity yet
            </div>
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                  {slices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-1 text-center text-xs text-muted-foreground">Total out: {formatCurrency(total)}</p>
      </CardContent>
    </Card>
  );
}

export function SavingsGoalWidget({ balance }: { balance: number }) {
  const goal = 10000;
  const pct = Math.min(100, Math.round((balance / goal) * 100));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Savings Goal
        </CardTitle>
        <Badge variant="secondary">{pct}%</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(goal)} target</p>
          </div>
          <PiggyBank className="h-10 w-10 text-primary/60" />
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {pct >= 100 ? "Goal reached! Set a new one." : `${formatCurrency(Math.max(0, goal - balance))} to go`}
        </p>
      </CardContent>
    </Card>
  );
}

type FxRow = { pair: string; rate: number; prev: number };

const FX_PAIRS: { pair: string; base: string; quote: string }[] = [
  { pair: "EUR / USD", base: "EUR", quote: "USD" },
  { pair: "GBP / USD", base: "GBP", quote: "USD" },
  { pair: "USD / JPY", base: "USD", quote: "JPY" },
  { pair: "USD / NGN", base: "USD", quote: "NGN" },
];

const FALLBACK: Record<string, number> = {
  "EUR / USD": 1.0842,
  "GBP / USD": 1.2715,
  "USD / JPY": 154.32,
  "USD / NGN": 1580.5,
};

async function fetchPairRate(base: string, quote: string): Promise<number | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number> };
    return json.rates?.[quote] ?? null;
  } catch {
    return null;
  }
}

export function ExchangeRatesWidget() {
  const [rows, setRows] = useState<FxRow[]>(() =>
    FX_PAIRS.map((p) => ({ pair: p.pair, rate: FALLBACK[p.pair], prev: FALLBACK[p.pair] })),
  );
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Fetch live rates every 5 seconds — no simulation between fetches
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results = await Promise.all(
        FX_PAIRS.map(async (p) => ({ pair: p.pair, rate: await fetchPairRate(p.base, p.quote) })),
      );
      if (cancelled) return;
      setRows((curr) =>
        curr.map((r) => {
          const found = results.find((x) => x.pair === r.pair);
          const newRate = found?.rate ?? r.rate;
          return { pair: r.pair, rate: newRate, prev: r.rate };
        }),
      );
      setUpdatedAt(new Date());
    };
    load();
    const id = setInterval(load, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-primary" /> FX Rates
          <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-label="live" />
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.map((r) => {
          const changePct = r.prev ? ((r.rate - r.prev) / r.prev) * 100 : 0;
          const tickUp = r.rate >= r.prev;
          return (
            <div key={r.pair} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium">{r.pair}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-sm tabular-nums transition-colors ${
                    tickUp ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {r.rate.toFixed(r.rate > 100 ? 2 : 4)}
                </span>
                <span
                  className={`flex w-16 items-center justify-end gap-0.5 text-xs tabular-nums ${
                    changePct >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {changePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(changePct).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
        <p className="pt-2 text-[10px] text-muted-foreground">
          Live indicative rates{updatedAt ? ` · synced ${updatedAt.toLocaleTimeString()}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}