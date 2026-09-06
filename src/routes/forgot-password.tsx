import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  requestPasswordResetCode,
  verifyPasswordResetCode,
  resetPasswordWithCode,
} from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Bank of Sydney" },
      { name: "description", content: "Forgot your Bank of Sydney password? Enter your email to receive a 6-digit verification code." },
      { property: "og:title", content: "Forgot Password — Bank of Sydney" },
      { property: "og:description", content: "Reset your Bank of Sydney password with a secure 6-digit verification code." },
      { property: "og:url", content: "/forgot-password" },
    ],
    links: [
      { rel: "canonical", href: "/forgot-password" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const requestCode = useServerFn(requestPasswordResetCode);
  const verifyCode = useServerFn(verifyPasswordResetCode);
  const resetPwd = useServerFn(resetPasswordWithCode);

  const [stage, setStage] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestCode({ data: { email } });
      toast.success("If that email exists, a 6-digit code has been sent.");
      setStage("code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyCode({ data: { email, code } });
      setStage("password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      await resetPwd({ data: { email, code, newPassword: password } });
      toast.success("Password updated. You can now sign in.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {stage === "email" && "Forgot your password?"}
            {stage === "code" && "Enter your verification code"}
            {stage === "password" && "Set a new password"}
          </CardTitle>
          <CardDescription>
            {stage === "email" && "We'll email you a 6-digit verification code."}
            {stage === "code" && `We sent a 6-digit code to ${email}. It expires in 15 minutes.`}
            {stage === "password" && "Choose a strong password you haven't used elsewhere."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "email" && (
            <form onSubmit={submitEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send verification code
              </Button>
              <p className="text-center text-sm"><Link to="/auth" className="text-primary hover:underline">Back to sign in</Link></p>
            </form>
          )}
          {stage === "code" && (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center tracking-[0.5em] text-lg"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify code
              </Button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => { setStage("email"); setCode(""); }} className="text-primary hover:underline">
                  Use a different email
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await requestCode({ data: { email } });
                      toast.success("New code sent.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not resend");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
          {stage === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}