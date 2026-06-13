import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFundAccount } from "@/lib/admin-portal.functions";
import { updateBrandSettings } from "@/lib/brand.functions";
import { bootstrapAdmin } from "@/lib/admin-bootstrap.functions";
import {
  setTransferRestriction,
  clearTransferRestriction,
  listTransferRestrictions,
} from "@/lib/transfer-restrictions.functions";
import { useBrand } from "@/hooks/use-brand";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock, Loader2, ShieldCheck, Upload, KeyRound, MessageCircle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-portal")({
  head: () => ({ meta: [{ title: "Admin Portal" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPortalPage,
});

function AdminPortalPage() {
  const { data: gate, isLoading } = useQuery({
    queryKey: ["admin-gate"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { signedIn: false, isAdmin: false } as const;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      return { signedIn: true, isAdmin: !!isAdmin } as const;
    },
    staleTime: 30_000,
  });
  const unlocked = !!gate?.isAdmin;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
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
            {unlocked
              ? "Manage funding and branding."
              : gate?.signedIn
                ? "Your account doesn't have admin access."
                : "Sign in with an admin account to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking access…
            </div>
          ) : !unlocked ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {gate?.signedIn
                  ? "You're signed in, but your account is not an admin. If this is a fresh setup with no admin yet, use the bootstrap panel below."
                  : "Sign in first, then return here. If this is a fresh setup, the first signed-in user can claim admin via the bootstrap panel."}
              </p>
              <BootstrapAdminPanel />
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="fund">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="fund">Fund account</TabsTrigger>
                  <TabsTrigger value="brand">Branding</TabsTrigger>
                  <TabsTrigger value="support">Support</TabsTrigger>
                  <TabsTrigger value="site">Site</TabsTrigger>
                </TabsList>
                <TabsContent value="fund" className="pt-4">
                  <FundTab />
                </TabsContent>
                <TabsContent value="brand" className="pt-4">
                  <BrandTab />
                </TabsContent>
                <TabsContent value="support" className="pt-4">
                  <SupportTab />
                </TabsContent>
                <TabsContent value="site" className="pt-4">
                  <MaintenanceTab />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FundTab() {
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fund = useServerFn(adminFundAccount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fund({
        data: {
          accountNumber: accountNumber.trim(),
          amount: Number(amount),
          senderName: senderName.trim(),
        },
      });
      toast.success(
        `Funded ${res.holder || "account"} (${res.accountNumber}). New balance: ${res.newBalance.toLocaleString()}`,
      );
      setAccountNumber("");
      setAmount("");
      setSenderName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Funding failed";
      toast.error(msg.replace(/^Error:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sender">Name of sender</Label>
        <Input
          id="sender"
          autoComplete="off"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Bank of Sydney"
          maxLength={100}
          required
        />
      </div>
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
    </form>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function BootstrapAdminPanel() {
  const claim = useServerFn(bootstrapAdmin);
  const [busy, setBusy] = useState(false);

  const onClaim = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in first, then return here to claim admin.");
        return;
      }
      const res = await claim();
      if (res.ok) toast.success("You are now an admin on this project.");
      else toast.message(res.reason ?? "Admin already exists");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <div className="font-medium mb-1 flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> First-time setup
      </div>
      <p className="text-muted-foreground mb-2">
        On a fresh remix or new backend, click below to make your signed-in account
        the admin. Only works if no admin exists yet.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onClaim} disabled={busy}>
        {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claiming…</> : "Claim admin role"}
      </Button>
    </div>
  );
}

function BrandTab() {
  const brand = useBrand();
  const qc = useQueryClient();
  const update = useServerFn(updateBrandSettings);
  const [bankName, setBankName] = useState(brand.bankName);
  const [tagline, setTagline] = useState(brand.tagline);
  const [supportEmail, setSupportEmail] = useState(brand.supportEmail);
  const [supportPhone, setSupportPhone] = useState(brand.supportPhone);
  const [address, setAddress] = useState(brand.address);
  const [footerText, setFooterText] = useState(brand.footerText);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [markDataUrl, setMarkDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const markInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialized.current) return;
    if (brand.bankName) {
      setBankName(brand.bankName);
      setTagline(brand.tagline);
      setSupportEmail(brand.supportEmail);
      setSupportPhone(brand.supportPhone);
      setAddress(brand.address);
      setFooterText(brand.footerText);
      initialized.current = true;
    }
  }, [brand]);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_400_000) {
      toast.error("Image too large (max ~1.4MB)");
      return;
    }
    try {
      setter(await fileToDataUrl(file));
    } catch {
      toast.error("Could not read image");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        data: {
          bankName: bankName.trim(),
          tagline,
          supportEmail,
          supportPhone,
          address,
          footerText,
          ...(logoDataUrl !== null ? { logoDataUrl } : {}),
          ...(markDataUrl !== null ? { markDataUrl } : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      setLogoDataUrl(null);
      setMarkDataUrl(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (markInputRef.current) markInputRef.current.value = "";
      toast.success("Branding updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg.replace(/^Error:\s*/, ""));
    } finally {
      setSaving(false);
    }
  };

  const resetLogo = async () => {
    setSaving(true);
    try {
      await update({ data: { logoDataUrl: null } });
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Logo reset to default");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Reset failed");
    } finally {
      setSaving(false);
    }
  };
  const resetMark = async () => {
    setSaving(true);
    try {
      await update({ data: { markDataUrl: null } });
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Mark reset to default");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bn">Bank name</Label>
          <Input id="bn" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tg">Tagline</Label>
          <Input id="tg" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="se">Support email</Label>
          <Input id="se" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp">Support phone</Label>
          <Input id="sp" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} maxLength={50} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ad">Address</Label>
          <Textarea id="ad" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ft">Homepage footer text</Label>
          <Input
            id="ft"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            maxLength={300}
            placeholder="© 2026 Bank of Sydney. All rights reserved."
          />
          <p className="text-xs text-muted-foreground">Shown at the bottom of the homepage.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-3">
          <Label>Main logo (wordmark)</Label>
          <div className="flex items-center gap-3">
            <img
              src={logoDataUrl || brand.logoUrl}
              alt="Logo preview"
              className="h-10 w-auto rounded bg-muted object-contain p-1"
            />
            <Input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, setLogoDataUrl)}
              className="text-xs"
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetLogo} disabled={saving}>
            Reset to default
          </Button>
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          <Label>Small mark / favicon</Label>
          <div className="flex items-center gap-3">
            <img
              src={markDataUrl || brand.markUrl}
              alt="Mark preview"
              className="h-10 w-10 rounded bg-muted object-contain p-1"
            />
            <Input
              ref={markInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, setMarkDataUrl)}
              className="text-xs"
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetMark} disabled={saving}>
            Reset to default
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Upload className="h-4 w-4 mr-2" /> Save branding</>}
      </Button>
    </form>
  );
}

function SupportTab() {
  const brand = useBrand();
  const qc = useQueryClient();
  const update = useServerFn(updateBrandSettings);
  const [enabled, setEnabled] = useState(brand.supportEnabled);
  const [whatsapp, setWhatsapp] = useState(brand.supportWhatsapp);
  const [telegram, setTelegram] = useState(brand.supportTelegram);
  const [chatUrl, setChatUrl] = useState(brand.supportChatUrl);
  const [email, setEmail] = useState(brand.supportEmail);
  const [message, setMessage] = useState(brand.supportMessage);
  const [chatScript, setChatScript] = useState(brand.supportChatScript);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    setEnabled(brand.supportEnabled);
    setWhatsapp(brand.supportWhatsapp);
    setTelegram(brand.supportTelegram);
    setChatUrl(brand.supportChatUrl);
    setEmail(brand.supportEmail);
    setMessage(brand.supportMessage);
    setChatScript(brand.supportChatScript);
    initialized.current = true;
  }, [brand]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        data: {
          supportEnabled: enabled,
          supportWhatsapp: whatsapp.trim(),
          supportTelegram: telegram.trim(),
          supportChatUrl: chatUrl.trim(),
          supportEmail: email.trim(),
          supportMessage: message,
          supportChatScript: chatScript,
        },
      });
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success(enabled ? "Live support is now visible to users" : "Support settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">Show live support on homepage & dashboard</div>
            <p className="text-xs text-muted-foreground">When off, users see no support widget.</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wa">WhatsApp number</Label>
          <Input id="wa" placeholder="+15551234567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={50} />
          <p className="text-xs text-muted-foreground">International format, no spaces.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tg">Telegram username</Label>
          <Input id="tg" placeholder="yourbankhelp" value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="em">Support email</Label>
          <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch">Chat link (Smartsupp / Tawk / Crisp / Intercom)</Label>
          <Input id="ch" placeholder="https://widget.smartsupp.com/..." value={chatUrl} onChange={(e) => setChatUrl(e.target.value)} maxLength={500} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="msg">Default pre-filled message</Label>
          <Textarea id="msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save support settings"}
      </Button>
    </form>
  );
}
function MaintenanceTab() {
  const brand = useBrand();
  const qc = useQueryClient();
  const update = useServerFn(updateBrandSettings);
  const [enabled, setEnabled] = useState(brand.maintenanceMode);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    setEnabled(brand.maintenanceMode);
    initialized.current = true;
  }, [brand]);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    try {
      await update({ data: { maintenanceMode: next } });
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success(next ? "Maintenance mode ON — users see the notice." : "Maintenance mode OFF.");
    } catch (err) {
      setEnabled(!next);
      toast.error(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">Site under development notice</div>
            <p className="text-xs text-muted-foreground">
              When ON, signed-in users see only an "under development" message on their dashboard. Admins are unaffected.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} />
      </div>
      <Button
        type="button"
        variant={enabled ? "destructive" : "default"}
        className="w-full"
        disabled={saving}
        onClick={() => toggle(!enabled)}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
        ) : enabled ? (
          "Turn OFF maintenance mode"
        ) : (
          "Turn ON maintenance mode"
        )}
      </Button>
    </div>
  );
}
