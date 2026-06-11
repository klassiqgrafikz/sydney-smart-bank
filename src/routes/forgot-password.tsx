import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Bank of Sydney" },
      { name: "description", content: "Forgot your Bank of Sydney password? Enter your email to receive a secure reset link." },
      { property: "og:title", content: "Forgot Password — Bank of Sydney" },
      { property: "og:description", content: "Reset your Bank of Sydney password with a secure email link." },
      { property: "og:url", content: "https://sydney-smart-bank.lovable.app/forgot-password" },
    ],
    links: [
      { rel: "canonical", href: "https://sydney-smart-bank.lovable.app/forgot-password" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>We'll email you a secure reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Send reset link</Button>
            <p className="text-center text-sm"><Link to="/auth" className="text-primary hover:underline">Back to sign in</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}