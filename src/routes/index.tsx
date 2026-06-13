import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Search, Menu } from "lucide-react";
import { useBrand } from "@/hooks/use-brand";
import { LiveSupport } from "@/components/live-support";

const heroImage = "/brand/landing-hero-banking.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bank of Sydney — Premium Global Online Banking" },
      { name: "description", content: "Premium global banking with Bank of Sydney. Open an account in minutes and send money worldwide with bank-grade security." },
      { property: "og:title", content: "Bank of Sydney — Premium Global Online Banking" },
      { property: "og:description", content: "Premium global banking with Bank of Sydney. Open an account in minutes and send money worldwide." },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Bank of Sydney — Premium Global Online Banking" },
      { name: "twitter:description", content: "Premium global banking. Open an account in minutes." },
    ],
    links: [
      { rel: "canonical", href: "/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BankOrCreditUnion",
          name: "Bank of Sydney",
          description: "Premium global online banking — send, receive, and manage money worldwide.",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const brand = useBrand();
  return (
    <div className="min-h-screen bg-background">
      {/* Top navy bar: Contact us | Login */}
      <div className="grid grid-cols-2 bg-[#0a2756] text-white">
        <a
          href="#support"
          className="flex items-center justify-center py-5 text-lg font-medium border-r border-white/10 hover:bg-white/5 transition"
        >
          Contact us
        </a>
        <Link
          to="/auth"
          className="flex items-center justify-center py-5 text-lg font-medium hover:bg-white/5 transition"
        >
          Login
        </Link>
      </div>

      {/* White header: search | logo | menu */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <button aria-label="Search" className="p-2 text-[#0a2756]">
            <Search className="h-7 w-7" strokeWidth={2.5} />
          </button>
          <Link to="/" aria-label={brand.bankName} className="flex items-center">
            <img src={brand.logoUrl} alt={brand.bankName} className="h-10 w-auto md:h-12" />
          </Link>
          <button aria-label="Menu" className="p-2 text-[#0a2756]">
            <Menu className="h-8 w-8" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main>
        {/* Hero image on light blue */}
        <section className="bg-[#cfe5f0]">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <img
              src={heroImage}
              alt="Online banking on laptop and phone"
              width={1280}
              height={896}
              className="mx-auto w-full max-w-3xl"
            />
          </div>
        </section>

        {/* Headline + CTA buttons */}
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-[#0a2756]">
            The new Online<br />Banking is here
          </h1>

          <div className="mt-10 space-y-5">
            <Link to="/auth" className="block">
              <Button
                size="lg"
                className="w-full h-16 rounded-full bg-[#1e88d6] hover:bg-[#1976c2] text-white text-xl font-semibold shadow-md"
              >
                Register Here
              </Button>
            </Link>
          </div>
        </section>

        <section id="support" className="mx-auto max-w-6xl px-4 pb-12 scroll-mt-24">
          <LiveSupport hideEmail />
        </section>
      </main>

      <footer className="border-t bg-[#0a2756] text-white/80">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm">
          {brand.footerText}
        </div>
      </footer>
    </div>
  );
}