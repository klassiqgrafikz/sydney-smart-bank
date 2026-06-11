import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminFundAccount } from "@/lib/admin-portal.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2, ShieldCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin-portal")({
  head: () => ({ meta: [{ title: "Admin Portal" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPortalPage,
});

function AdminPortalPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fund = useServerFn(adminFundAccount);

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === "1975") {
      setUnlocked(true);
    } else {
      toast.error("Invalid access code");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fund({
        data: { code: code.trim(), accountNumber: accountNumber.trim(), amount: Number(amount) },
      });
      toast.success(
        `Funded ${res.holder || "account"} (${res.accountNumber}). New balance: ${res.newBalance.toLocaleString()}`,
      );
      setAccountNumber("");
      setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Funding failed";
      toast.error(msg.replace(/^Error:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            {unlocked ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-primary" />
            )}
            <CardTitle>Admin Portal</CardTitle>
          </div>
          <CardDescription>
            {unlocked ? "Fund a user account by account number." : "Enter access code to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!unlocked ? (
            <form onSubmit={unlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Access code</Label>
                <Input
                  id="code"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Unlock</Button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account">Targeted account number</Label>
                <Input
                  id="account"
                  inputMode="numeric"
                  autoComplete="off"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 015234890123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Funding amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Funding…</>
                ) : (
                  "Fund account"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setUnlocked(false); setCode(""); }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Lock portal
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}