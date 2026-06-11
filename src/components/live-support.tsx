import { useBrand } from "@/hooks/use-brand";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail, Send, Headphones } from "lucide-react";

export function LiveSupport() {
  const brand = useBrand();
  if (!brand.supportEnabled) return null;

  const msg = encodeURIComponent(brand.supportMessage || "Hello, I need help.");
  const items: Array<{ label: string; sub: string; href: string; icon: React.ReactNode; color: string }> = [];

  if (brand.supportWhatsapp) {
    const num = brand.supportWhatsapp.replace(/\D/g, "");
    items.push({
      label: "WhatsApp",
      sub: "Chat with an agent",
      href: `https://wa.me/${num}?text=${msg}`,
      icon: <MessageCircle className="h-5 w-5" />,
      color: "bg-emerald-500/10 text-emerald-600",
    });
  }
  if (brand.supportTelegram) {
    const handle = brand.supportTelegram.replace(/^@/, "");
    items.push({
      label: "Telegram",
      sub: `@${handle}`,
      href: `https://t.me/${handle}`,
      icon: <Send className="h-5 w-5" />,
      color: "bg-sky-500/10 text-sky-600",
    });
  }
  if (brand.supportEmail) {
    items.push({
      label: "Email",
      sub: brand.supportEmail,
      href: `mailto:${brand.supportEmail}`,
      icon: <Mail className="h-5 w-5" />,
      color: "bg-violet-500/10 text-violet-600",
    });
  }
  if (brand.supportChatUrl) {
    items.push({
      label: "Live Chat",
      sub: "Instant messaging",
      href: brand.supportChatUrl,
      icon: <Headphones className="h-5 w-5" />,
      color: "bg-amber-500/10 text-amber-600",
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
          <Headphones className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Live Support</h2>
          <p className="text-xs text-muted-foreground">We're online — reach us anytime.</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <a
            key={it.label}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:bg-accent hover:border-primary/40"
          >
            <span className={`grid h-10 w-10 place-items-center rounded-full ${it.color}`}>{it.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{it.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}