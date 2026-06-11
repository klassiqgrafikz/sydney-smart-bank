import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

type Tx = {
  id: string;
  amount: number;
  created_at: string;
  description: string | null;
  receiver_name: string | null;
  sender_name: string | null;
  status: string;
  transaction_id: string;
  transaction_type: string;
};

export function TransactionDetailsDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Tx | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const incoming = tx ? ["receive", "credit"].includes(tx.transaction_type) : false;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full ${
                incoming ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              }`}
            >
              {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <span className="capitalize">{tx?.transaction_type ?? "Transaction"}</span>
          </DialogTitle>
          <DialogDescription>Transaction details</DialogDescription>
        </DialogHeader>
        {tx && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount</p>
              <p className={`mt-1 text-3xl font-bold ${incoming ? "text-emerald-600" : "text-foreground"}`}>
                {incoming ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </p>
              <Badge variant="secondary" className="mt-2 capitalize">{tx.status}</Badge>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <Row label="Transaction ID" value={<span className="font-mono text-xs break-all">{tx.transaction_id}</span>} />
              <Row label="Date" value={formatDate(tx.created_at)} />
              <Row label="Type" value={<span className="capitalize">{tx.transaction_type}</span>} />
              <Row label="Sender" value={tx.sender_name ?? "—"} />
              <Row label="Receiver" value={tx.receiver_name ?? "—"} />
              <Row label="Description" value={tx.description ?? "—"} />
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}