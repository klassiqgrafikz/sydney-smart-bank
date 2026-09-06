import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, ShieldCheck, Snowflake, Sun, Loader2, Eraser } from "lucide-react";
import { formatCurrency, formatDate, formatAccountNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — Bank of Sydney" }] }),
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id).eq("role", "admin").maybeSingle();
    if (!roles) throw redirect({ to: "/dashboard" });
  },
  component: AdminPortal,
});

function AdminPortal() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState({ kind: "credit" as "credit" | "debit", amount: "", note: "" });
  const [loading, setLoading] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (users ?? []).filter((u) =>
      !s || [u.first_name, u.last_name, u.email, u.account_number].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [users, q]);

  const selected = users?.find((u) => u.id === selectedId) ?? null;

  const toggleFreeze = async (u: typeof filtered[number]) => {
    const next = u.account_status === "frozen" ? "active" : "frozen";
    const { error } = await supabase.from("profiles").update({ account_status: next }).eq("id", u.id);
    if (error) return toast.error(error.message);
    const { data: me } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({ actor_id: me.user?.id, target_user_id: u.id, action: `account_${next}` });
    toast.success(`Account ${next}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-logs"] });
  };

  const resetUser = async (u: typeof filtered[number]) => {
    const { error } = await supabase.rpc("admin_reset_user", { _target_user_id: u.id });
    if (error) return toast.error(error.message);
    toast.success(`Wiped balance and transaction history for ${u.first_name} ${u.last_name}`);
    qc.invalidateQueries();
  };

  const [resetAcct, setResetAcct] = useState("");
  const [resetting, setResetting] = useState(false);
  const resetByAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const acct = resetAcct.trim();
    if (!acct) return toast.error("Enter an account number");
    setResetting(true);
    const { data, error } = await supabase.rpc("admin_reset_user_by_account", { _account_number: acct });
    setResetting(false);
    if (error) return toast.error(error.message);
    const hit = Array.isArray(data) ? data[0] : null;
    toast.success(hit?.full_name ? `Wiped balance and history for ${hit.full_name}` : "Account reset");
    setResetAcct("");
    qc.invalidateQueries();
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amt = parseFloat(adjust.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    const newBal = adjust.kind === "credit" ? Number(selected.balance) + amt : Number(selected.balance) - amt;
    if (newBal < 0) { setLoading(false); return toast.error("Balance cannot be negative"); }

    const { error: bErr } = await supabase.from("profiles").update({ balance: newBal }).eq("id", selected.id);
    if (bErr) { setLoading(false); return toast.error(bErr.message); }
    await supabase.from("transactions").insert({
      user_id: selected.id, amount: amt, transaction_type: adjust.kind,
      description: adjust.note || `Admin ${adjust.kind}`,
      sender_name: adjust.kind === "credit" ? "Bank of Sydney Admin" : `${selected.first_name} ${selected.last_name}`,
      receiver_name: adjust.kind === "credit" ? `${selected.first_name} ${selected.last_name}` : "Bank of Sydney Admin",
    });
    const { data: me } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: me.user?.id, target_user_id: selected.id, action: `balance_${adjust.kind}`,
      details: { amount: amt, note: adjust.note },
    });
    toast.success(`Balance ${adjust.kind}ed`);
    setAdjust({ kind: "credit", amount: "", note: "" });
    setSelectedId(null);
    setLoading(false);
    qc.invalidateQueries();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Portal</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>{users?.length ?? 0} accounts</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 md:w-72" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="font-mono text-xs">{formatAccountNumber(u.account_number)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(u.balance)}</TableCell>
                    <TableCell>
                      <Badge variant={u.account_status === "frozen" ? "destructive" : "secondary"} className="capitalize">{u.account_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="mr-2" onClick={() => setSelectedId(u.id)}>Adjust</Button>
                      <Button size="sm" variant="ghost" className="mr-2" onClick={() => toggleFreeze(u)}>
                        {u.account_status === "frozen" ? <Sun className="mr-1 h-3 w-3" /> : <Snowflake className="mr-1 h-3 w-3" />}
                        {u.account_status === "frozen" ? "Unfreeze" : "Freeze"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Eraser className="mr-1 h-3 w-3" /> Reset
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset {u.first_name} {u.last_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will set their balance to {formatCurrency(0)} and permanently delete all of their transaction history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetUser(u)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Erase balance & history
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eraser className="h-5 w-5 text-destructive" /> Account reset</CardTitle>
          <CardDescription>Erase a customer's balance and entire transaction history in one click using their account number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={resetByAccount} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="reset-acct">Account number</Label>
              <Input
                id="reset-acct"
                inputMode="numeric"
                placeholder="e.g. 123456789012345"
                value={resetAcct}
                onChange={(e) => setResetAcct(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={!resetAcct.trim() || resetting}>
                  {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
                  Erase balance & history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset this account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Account <span className="font-mono">{resetAcct.trim()}</span> will have its balance set to {formatCurrency(0)} and all transactions permanently deleted. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); resetByAccount(e as unknown as React.FormEvent); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, erase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent admin activity</CardTitle></CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="divide-y text-sm">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2">
                  <span className="capitalize">{l.action.replaceAll("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust balance</DialogTitle>
            {selected && <CardDescription>{selected.first_name} {selected.last_name} — current {formatCurrency(selected.balance)}</CardDescription>}
          </DialogHeader>
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={adjust.kind} onValueChange={(v) => setAdjust({ ...adjust, kind: v as "credit" | "debit" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (add funds)</SelectItem>
                  <SelectItem value="debit">Debit (remove funds)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" required value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Note</Label><Input value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} placeholder="Optional reason" /></div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Apply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}