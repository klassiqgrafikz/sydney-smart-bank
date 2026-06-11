import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Shield, Globe, Zap, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useBrand } from "@/hooks/use-brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bank of Sydney — Banking, reimagined" },
      { name: "description", content: "Premium global banking. Open an account in minutes and send money worldwide with Bank of Sydney." },
      { property: "og:title", content: "Bank of Sydney" },
      { property: "og:description", content: "Premium global banking. Open an account in minutes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const brand = useBrand();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label={brand.bankName} className="flex items-center gap-2">
            <img src={brand.logoUrl} alt={brand.bankName} className="h-9 w-auto md:h-10" />
            <span className="hidden text-base font-semibold sm:inline">{brand.bankName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Open account</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Trusted by 2M+ customers worldwide
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
              Banking,<br />reimagined.
            </h1>
            <p className="mt-5 max-w-md text-white/80">
              Move money anywhere in the world. Track every cent. All from one beautifully simple account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg" variant="secondary">Open free account <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Sign in</Button></Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between text-white/70 text-xs">
                <span>Available balance</span>
                <span>USD</span>
              </div>
              <div className="mt-2 text-4xl font-bold text-white">$128,450.27</div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-white">
                {["Send", "Receive", "Withdraw"].map((l) => (
                  <div key={l} className="rounded-xl bg-white/10 p-3 text-sm">{l}</div>
                ))}
              </div>
              <div className="mt-6 space-y-2 text-sm text-white/80">
                {[
                  { name: "John Smith", a: "+$1,200.00" },
                  { name: "Wire to HSBC UK", a: "-$3,450.00" },
                  { name: "Salary", a: "+$8,200.00" },
                ].map((r) => (
                  <div key={r.name} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>{r.name}</span><span>{r.a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { i: Globe, t: "Global transfers", d: "Send to 150+ countries with SWIFT, IBAN and local routing." },
            { i: Zap, t: "Instant settlements", d: "Domestic transfers settle in seconds, around the clock." },
            { i: Lock, t: "Bank-grade security", d: "2FA, encryption, and 24/7 fraud monitoring on every account." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {brand.bankName}. All rights reserved.
          {brand.supportEmail ? <> · <a href={`mailto:${brand.supportEmail}`} className="hover:underline">{brand.supportEmail}</a></> : null}
          {brand.supportPhone ? <> · {brand.supportPhone}</> : null}
        </div>
      </footer>
    </div>
  );
}