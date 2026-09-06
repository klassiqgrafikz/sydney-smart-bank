import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Bank of Sydney" },
      { name: "description", content: "Set a new password for your Bank of Sydney account to securely regain access." },
      { property: "og:title", content: "Reset Password — Bank of Sydney" },
      { property: "og:description", content: "Choose a new password for your Bank of Sydney account." },
      { property: "og:url", content: "/reset-password" },
    ],
    links: [
      { rel: "canonical", href: "/reset-password" },
    ],
  }),
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // PKCE flow: ?code=... in query string
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (mounted && error) setError(error.message);
        // Clean the URL so a refresh doesn't try to re-exchange.
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
      // Implicit/recovery flow: #access_token=... is handled by detectSessionInUrl.
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setReady(true);
        return;
      }
      // Fallback: wait briefly for PASSWORD_RECOVERY / SIGNED_IN.
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          setReady(true);
        }
      });
      setTimeout(() => {
        if (mounted && !ready) {
          setError((prev) => prev ?? "This reset link is invalid or has expired. Request a new one.");
        }
      }, 3000);
      return () => sub.subscription.unsubscribe();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return toast.error("Still preparing your reset link, hang on…");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a strong password you haven't used elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>New password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label>Confirm new password</Label><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {ready ? "Update password" : "Preparing…"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}