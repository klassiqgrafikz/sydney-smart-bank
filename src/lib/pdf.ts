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
  bankTagline?: string;
  logoDataUrl?: string;
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
  const tagline = opts.bankTagline || "";
  const supportEmail = opts.supportEmail || "support@bankofsydney.com";
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header band with logo
  doc.setFillColor(15, 30, 75);
  doc.rect(0, 0, pageWidth, 38, "F");
  // Thin accent stripe
  doc.setFillColor(212, 175, 55); // gold
  doc.rect(0, 38, pageWidth, 1.5, "F");

  let textX = 14;
  if (opts.logoDataUrl) {
    try {
      const fmt = opts.logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(opts.logoDataUrl, fmt, 14, 8, 22, 22);
      textX = 42;
    } catch {
      /* ignore logo errors */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(bankName.toUpperCase(), textX, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 225, 240);
  if (tagline) doc.text(tagline, textX, 24);
  doc.setFontSize(8);
  if (opts.address) doc.text(opts.address, textX, 30);
  const contactLine = [opts.supportPhone, supportEmail].filter(Boolean).join("  •  ");
  if (contactLine) doc.text(contactLine, textX, 35);

  // ── Title strip
  doc.setFillColor(245, 247, 252);
  doc.rect(0, 44, pageWidth, 14, "F");
  doc.setTextColor(15, 30, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("OFFICIAL TRANSACTION RECEIPT", pageWidth / 2, 53, { align: "center" });

  // Status badge (top-right)
  const status = (opts.status || "completed").toUpperCase();
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - 50, 47, 36, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, pageWidth - 32, 52.5, { align: "center" });

  // ── Diagonal watermark
  doc.saveGraphicsState();
  // @ts-expect-error setGState exists at runtime via jspdf
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.setTextColor(15, 30, 75);
  doc.setFontSize(110);
  doc.setFont("helvetica", "bold");
  doc.text(status, pageWidth / 2, pageHeight / 2 + 20, { align: "center", angle: 30 });
  doc.restoreGraphicsState();

  // ── Amount block
  doc.setTextColor(20, 20, 20);
  let y = 74;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("AMOUNT", 14, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(15, 30, 75);
  doc.text(formatCurrency(opts.amount), 14, y);

  // Date on right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("DATE & TIME", pageWidth - 14, y - 9, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDate(opts.date), pageWidth - 14, y, { align: "right" });

  y += 7;
  doc.setDrawColor(15, 30, 75);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  doc.setLineWidth(0.2);
  doc.setDrawColor(220, 220, 220);

  // ── Transaction details header
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 30, 75);
  doc.text("TRANSACTION DETAILS", 14, y);

  const rows: Array<[string, string]> = [
    ["Transaction ID", opts.transactionId],
    ["Type", opts.transactionType.charAt(0).toUpperCase() + opts.transactionType.slice(1)],
    ["Customer Name", opts.customerName],
    ["Account Number", opts.accountNumber],
  ];
  if (opts.counterparty) rows.push([opts.counterpartyLabel || "Counterparty", opts.counterparty]);
  if (opts.reference) rows.push(["Reference", opts.reference]);
  if (opts.description) rows.push(["Description", opts.description]);
  if (opts.extra) opts.extra.forEach((e) => rows.push([e.label, e.value]));

  autoTable(doc, {
    startY: y + 3,
    body: rows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3.5, lineColor: [230, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { textColor: [110, 120, 140], cellWidth: 60, fillColor: [248, 249, 252] },
      1: { fontStyle: "bold", textColor: [20, 20, 20] },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;

  // ── Signature & seal area
  const sigY = Math.min(finalY + 18, pageHeight - 50);
  doc.setDrawColor(180, 180, 180);
  doc.line(14, sigY, 80, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("Authorized Signature", 14, sigY + 4);

  // Round seal
  const sealX = pageWidth - 35;
  const sealY = sigY - 6;
  doc.setDrawColor(15, 30, 75);
  doc.setLineWidth(0.6);
  doc.circle(sealX, sealY, 14);
  doc.circle(sealX, sealY, 11);
  doc.setLineWidth(0.2);
  doc.setTextColor(15, 30, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(bankName.toUpperCase().slice(0, 22), sealX, sealY - 2, { align: "center" });
  doc.setFontSize(9);
  doc.text("VERIFIED", sealX, sealY + 2, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(opts.date).toISOString().slice(0, 10), sealX, sealY + 6, { align: "center" });

  // ── Footer
  doc.setFillColor(15, 30, 75);
  doc.rect(0, pageHeight - 22, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(bankName, 14, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 230);
  doc.setFontSize(7);
  doc.text(
    `This is a computer-generated receipt and is valid without a physical signature. Keep for your records.`,
    14,
    pageHeight - 9,
  );
  if (contactLine) doc.text(contactLine, 14, pageHeight - 4);

  const safeBank = bankName.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safeBank}_Receipt_${opts.transactionId}.pdf`);
}