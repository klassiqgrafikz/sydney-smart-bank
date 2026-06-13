import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useBrand } from "@/hooks/use-brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or Create an Account — Bank of Sydney" },
      { name: "description", content: "Sign in to your Bank of Sydney account or open a new account in minutes — secure, global online banking." },
      { property: "og:title", content: "Sign in or Create an Account — Bank of Sydney" },
      { property: "og:description", content: "Sign in to your Bank of Sydney account or open a new account in minutes." },
      { property: "og:url", content: "/auth" },
    ],
    links: [
      { rel: "canonical", href: "/auth" },
    ],
  }),
  component: AuthPage,
});

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
}: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const brand = useBrand();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-10 text-white md:flex" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="flex items-center gap-3 font-semibold">
          <img src={brand.markUrl} alt={brand.bankName} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
          <span className="text-lg">{brand.bankName}</span>
        </Link>
        <div>
          <p className="text-3xl font-semibold leading-tight">{brand.tagline}</p>
          <p className="mt-4 text-white/70">Send money across 150+ countries with rates you'll love and security you can trust.</p>
        </div>
        <p className="text-xs text-white/50">{brand.footerText}</p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={brand.markUrl} alt={brand.bankName} className="h-20 w-20 object-contain" />
            <h1 className="mt-3 text-xl font-bold tracking-tight">Sign in or create your {brand.bankName} account</h1>
            <p className="text-xs text-muted-foreground">Premium Online Banking</p>
          </div>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
        if (result.error) {
          toast.error("Google sign-in failed");
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Continue with Google
    </Button>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const brand = useBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        return toast.error("Email or password is incorrect. If you don't have an account yet, please sign up.");
      }
      if (msg.includes("email not confirmed")) {
        return toast.error("Please confirm your email before signing in.");
      }
      return toast.error(error.message);
    }
    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      setLoading(false);
      return toast.error(aalErr.message);
    }
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setMfa({ factorId: totp.id });
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    toast.success("Login successful");
    navigate({ to: "/dashboard" });
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setLoading(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfa.factorId });
    if (cErr || !challenge) {
      setLoading(false);
      return toast.error(cErr?.message ?? "Could not start verification");
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verified");
    navigate({ to: "/dashboard" });
  };

  if (mfa) {
    return (
      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={verifyMfa} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Authentication code</Label>
              <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); setMfa(null); setCode(""); }}>
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none md:border md:shadow-sm">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your {brand.bankName} account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
            </div>
            <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
          <div className="relative my-2 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">or</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <GoogleButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const brand = useBrand();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", country: "", password: "", confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          country: form.country,
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return toast.error("This email is already registered. Please sign in instead.");
      }
      return toast.error(error.message);
    }
    // Supabase returns a user with empty identities[] when the email is already registered
    // (to prevent email enumeration). Detect that case and show a clear message.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return toast.error("This email is already registered. Please sign in instead.");
    }
    toast.success(`Account created — welcome to ${brand.bankName}!`);
    navigate({ to: "/dashboard" });
  };

  return (
    <Card className="border-0 shadow-none md:border md:shadow-sm">
      <CardHeader>
        <CardTitle>Open your account</CardTitle>
        <CardDescription>It takes less than a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>First name</Label><Input required value={form.first_name} onChange={update("first_name")} /></div>
            <div className="space-y-1.5"><Label>Last name</Label><Input required value={form.last_name} onChange={update("last_name")} /></div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input required type="email" value={form.email} onChange={update("email")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={update("phone")} /></div>
            <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={update("country")} placeholder="Australia" /></div>
          </div>
          <div className="space-y-1.5"><Label>Password</Label><PasswordInput required value={form.password} onChange={update("password")} /></div>
          <div className="space-y-1.5"><Label>Confirm password</Label><PasswordInput required value={form.confirm} onChange={update("confirm")} /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
          <GoogleButton />
        </form>
      </CardContent>
    </Card>
  );
}