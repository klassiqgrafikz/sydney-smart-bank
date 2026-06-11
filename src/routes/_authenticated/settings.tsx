import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { Loader2, Moon, Sun, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Sydney Trust" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setPw({ next: "", confirm: "" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle><CardDescription>Manage how you sign in.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={change} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Confirm</Label><Input type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Change password
              </Button>
            </div>
          </form>
          <TwoFactorSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow title="Email alerts" desc="Account activity and security." v={emailNotif} onChange={setEmailNotif} />
          <ToggleRow title="SMS alerts" desc="Real-time payment alerts." v={smsNotif} onChange={setSmsNotif} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ title, desc, v, onChange }: { title: string; desc: string; v: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}

type Enrolling = { factorId: string; qr: string; secret: string };

function TwoFactorSection() {
  const [enabled, setEnabled] = useState(false);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const verified = data?.totp?.find((f) => f.status === "verified");
    setEnabled(Boolean(verified));
    setVerifiedFactorId(verified?.id ?? null);
    // Clean up any stale unverified factors so re-enroll always works
    const unverified = data?.totp?.filter((f) => f.status !== "verified") ?? [];
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    setReady(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Sydney Trust ${Date.now()}`,
    });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not start enrollment");
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const cancelEnroll = async () => {
    if (!enrolling) return;
    await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (cErr || !ch) {
      setBusy(false);
      return toast.error(cErr?.message ?? "Could not start challenge");
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication enabled");
    setEnrolling(null);
    setCode("");
    refresh();
  };

  const disable = async () => {
    if (!verifiedFactorId) return;
    if (!confirm("Disable two-factor authentication?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication disabled");
    refresh();
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Two-factor authentication
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {enabled
              ? "Active. You'll be asked for a 6-digit code at sign-in."
              : "Use an authenticator app (Google Authenticator, Authy, 1Password) for an extra layer of security."}
          </p>
        </div>
        {ready && !enrolling && (
          enabled ? (
            <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Disable
            </Button>
          ) : (
            <Button size="sm" onClick={startEnroll} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Enable
            </Button>
          )
        )}
      </div>

      {enrolling && (
        <form onSubmit={confirmEnroll} className="space-y-3 border-t pt-4">
          <p className="text-sm">1. Scan this QR code with your authenticator app.</p>
          <div className="flex justify-center rounded-md bg-white p-3">
            <img src={enrolling.qr} alt="2FA QR code" className="h-44 w-44" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Or enter this secret manually:&nbsp;
            <code className="break-all rounded bg-muted px-1.5 py-0.5 text-foreground">{enrolling.secret}</code>
          </p>
          <div className="space-y-2">
            <Label htmlFor="enroll-code">2. Enter the 6-digit code shown in your app</Label>
            <Input id="enroll-code" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Verify &amp; enable
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEnroll} disabled={busy}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}