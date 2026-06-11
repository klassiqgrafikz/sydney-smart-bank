import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatDateShort } from "./format";

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

export interface ReceiptOpts {
  bankName?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string;
  customerName: string;
  accountNumber: string;
  transactionId: string;
  transactionType: string;
  amount: number;
  date: string;
  status?: string;
  counterparty?: string;
  counterpartyLabel?: string;
  reference?: string;
  description?: string;
  extra?: Array<{ label: string; value: string }>;
}

export function generateReceiptPDF(opts: ReceiptOpts) {
  const bankName = opts.bankName || "Bank of Sydney";
  const supportEmail = opts.supportEmail || "support@bankofsydney.com";
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(30, 50, 110);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(bankName, 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Official Transaction Receipt", 14, 23);

  // Status badge
  const status = (opts.status || "completed").toUpperCase();
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - 50, 10, 36, 10, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(status, pageWidth - 32, 17, { align: "center" });

  // Amount block
  doc.setTextColor(20, 20, 20);
  let y = 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("AMOUNT", 14, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text(formatCurrency(opts.amount), 14, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(formatDate(opts.date), 14, y);

  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, pageWidth - 14, y);

  const rows: Array<[string, string]> = [
    ["Transaction ID", opts.transactionId],
    ["Type", opts.transactionType.charAt(0).toUpperCase() + opts.transactionType.slice(1)],
    ["Customer", opts.customerName],
    ["Account Number", opts.accountNumber],
  ];
  if (opts.counterparty) {
    rows.push([opts.counterpartyLabel || "Counterparty", opts.counterparty]);
  }
  if (opts.reference) rows.push(["Reference", opts.reference]);
  if (opts.description) rows.push(["Description", opts.description]);
  if (opts.extra) opts.extra.forEach((e) => rows.push([e.label, e.value]));

  autoTable(doc, {
    startY: y + 4,
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 } },
    columnStyles: {
      0: { textColor: [120, 120, 120], cellWidth: 55 },
      1: { fontStyle: "bold", textColor: [20, 20, 20] },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;

  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.line(14, finalY + 8, pageWidth - 14, finalY + 8);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text(
    `This receipt was generated electronically by ${bankName} and serves as proof of transaction.`,
    14,
    finalY + 15,
  );
  const contactBits = [supportEmail, opts.supportPhone].filter(Boolean).join("  •  ");
  if (contactBits) doc.text(contactBits, 14, finalY + 21);
  if (opts.address) doc.text(opts.address, 14, finalY + 27);

  const safeBank = bankName.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safeBank}_Receipt_${opts.transactionId}.pdf`);
}