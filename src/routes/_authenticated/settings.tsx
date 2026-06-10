import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { Loader2, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Sydney Trust" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
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
          <ToggleRow title="Two-factor authentication" desc="Add an extra layer of security at sign-in." v={twoFA} onChange={setTwoFA} />
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