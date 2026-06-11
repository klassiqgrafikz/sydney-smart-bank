import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { formatAccountNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value?: string | null;
  className?: string;
}

export function CopyAccountNumber({ value, className }: Props) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Account number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      title="Click to copy"
      className={cn(
        "inline-flex items-center gap-2 font-mono transition-opacity hover:opacity-80 disabled:cursor-not-allowed",
        className,
      )}
    >
      <span>{formatAccountNumber(value)}</span>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-70" />}
    </button>
  );
}

export function getAccountHolderName(profile?: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null): string {
  if (!profile) return "—";
  const full = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  if (full) return full;
  if (profile.email) {
    const local = profile.email.split("@")[0] ?? "";
    return local
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || profile.email;
  }
  return "—";
}