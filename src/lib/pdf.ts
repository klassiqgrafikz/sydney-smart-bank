import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDateShort } from "./format";

export interface StatementTx {
  created_at: string;
  transaction_id: string;
  transaction_type: string;
  description: string | null;
  amount: number;
  status: string;
}

export function generateStatementPDF(opts: {
  customerName: string;
  accountNumber: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTx[];
  bankName?: string;
  supportEmail?: string;
}) {
  const bankName = opts.bankName || "Bank of Sydney";
  const supportEmail = opts.supportEmail || "support@bankofsydney.com";
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(30, 50, 110);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(bankName, 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Account Statement", 14, 20);

  // Customer block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.text("Customer:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(opts.customerName, 50, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Account #:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(opts.accountNumber, 50, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Period:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${formatDateShort(opts.periodStart)} — ${formatDateShort(opts.periodEnd)}`, 50, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Opening Balance:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatCurrency(opts.openingBalance), 60, y);

  doc.setFont("helvetica", "bold");
  doc.text("Closing Balance:", 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatCurrency(opts.closingBalance), 160, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Transaction ID", "Type", "Description", "Amount", "Status"]],
    body: opts.transactions.map((t) => [
      formatDateShort(t.created_at),
      t.transaction_id,
      t.transaction_type,
      t.description ?? "—",
      formatCurrency(t.amount),
      t.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 50, 110], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `This statement is generated electronically by ${bankName}. For inquiries, contact ${supportEmail}`,
    14,
    finalY + 12,
  );

  const safe = bankName.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safe}_Statement_${formatDateShort(opts.periodStart)}_${formatDateShort(opts.periodEnd)}.pdf`);
}