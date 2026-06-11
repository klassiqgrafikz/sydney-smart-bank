import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateReceiptPDF, type ReceiptOpts } from "@/lib/pdf";
import { useBrand } from "@/hooks/use-brand";
import { useProfile } from "@/hooks/use-profile";

export interface ReceiptData {
  transactionId: string;
  transactionType: string;
  amount: number;
  date: string;
  counterparty?: string;
  counterpartyLabel?: string;
  reference?: string;
  description?: string;
  extra?: Array<{ label: string; value: string }>;
}

export function TransactionReceiptDialog({
  receipt,
  onClose,
  title = "Transaction Successful",
  subtitle = "Your transaction has been processed.",
}: {
  receipt: ReceiptData | null;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const brand = useBrand();
  const { data: profile } = useProfile();

  const handleDownload = () => {
    if (!receipt || !profile) return;
    const opts: ReceiptOpts = {
      bankName: brand.bankName,
      supportEmail: brand.supportEmail,
      supportPhone: brand.supportPhone,
      address: brand.address,
      customerName: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || (profile.email ?? "Customer"),
      accountNumber: profile.account_number ?? "—",
      transactionId: receipt.transactionId,
      transactionType: receipt.transactionType,
      amount: receipt.amount,
      date: receipt.date,
      status: "completed",
      counterparty: receipt.counterparty,
      counterpartyLabel: receipt.counterpartyLabel,
      reference: receipt.reference,
      description: receipt.description,
      extra: receipt.extra,
    };
    generateReceiptPDF(opts);
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{subtitle}</DialogDescription>
        </DialogHeader>
        {receipt && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
            <Row k="Type" v={<span className="capitalize">{receipt.transactionType}</span>} />
            <Row k="Amount" v={<span className="font-semibold">{formatCurrency(receipt.amount)}</span>} />
            {receipt.counterparty && <Row k={receipt.counterpartyLabel ?? "Counterparty"} v={receipt.counterparty} />}
            {receipt.reference && <Row k="Reference" v={receipt.reference} />}
            <Row k="Transaction ID" v={<span className="font-mono text-xs break-all">{receipt.transactionId}</span>} />
            <Row k="Date" v={formatDate(receipt.date)} />
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Download PDF receipt
          </Button>
          <Button onClick={onClose} className="w-full sm:flex-1">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}