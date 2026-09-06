import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell, ArrowDownLeft, ArrowUpRight, Banknote, Inbox } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

type Tx = {
  id: string;
  transaction_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  status: string;
  created_at: string;
};

const READ_KEY = "stb_notif_read_at";

function iconFor(type: string) {
  if (type === "receive" || type === "credit") return <ArrowDownLeft className="h-4 w-4 text-success" />;
  if (type === "withdraw") return <Banknote className="h-4 w-4 text-warning" />;
  return <ArrowUpRight className="h-4 w-4 text-destructive" />;
}

function label(t: Tx) {
  if (t.transaction_type === "receive" || t.transaction_type === "credit") return `Received ${formatCurrency(t.amount)}`;
  if (t.transaction_type === "withdraw") return `Withdrew ${formatCurrency(t.amount)}`;
  if (t.transaction_type === "send" || t.transaction_type === "debit") return `Sent ${formatCurrency(t.amount)}`;
  return `${t.transaction_type} ${formatCurrency(t.amount)}`;
}

export function NotificationsBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(READ_KEY) ?? 0);
  });

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<Tx[]> => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data ?? []) as Tx[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const t = payload.new as Tx;
          toast.success(label(t), { description: t.description ?? t.sender_name ?? t.receiver_name ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const t = payload.new as Tx;
          const prev = payload.old as Partial<Tx>;
          if (prev?.status && prev.status !== t.status) {
            toast.info(`${label(t)} — ${t.status}`, {
              description: t.description ?? t.sender_name ?? t.receiver_name ?? undefined,
            });
          }
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transfers", filter: `user_id=eq.${userId}` },
        (payload) => {
          const tr = payload.new as { amount: number; recipient_name: string; status: string; reference: string | null };
          toast.success(`Transfer to ${tr.recipient_name} — ${formatCurrency(tr.amount)}`, {
            description: tr.reference ?? `Status: ${tr.status}`,
          });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          qc.invalidateQueries({ queryKey: ["transfers"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transfers", filter: `user_id=eq.${userId}` },
        (payload) => {
          const tr = payload.new as { amount: number; recipient_name: string; status: string };
          const prev = payload.old as { status?: string };
          if (prev?.status && prev.status !== tr.status) {
            toast.info(`Transfer to ${tr.recipient_name} — ${tr.status}`, {
              description: formatCurrency(tr.amount),
            });
          }
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          qc.invalidateQueries({ queryKey: ["transfers"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const unread = items.filter((t) => new Date(t.created_at).getTime() > readAt).length;

  const markRead = () => {
    const now = Date.now();
    setReadAt(now);
    if (typeof window !== "undefined") localStorage.setItem(READ_KEY, String(now));
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markRead(); }}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/transactions" onClick={() => setOpen(false)}>View all</Link>
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-6 w-6" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">{iconFor(t.transaction_type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{label(t)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.description ?? t.sender_name ?? t.receiver_name ?? t.transaction_id}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}