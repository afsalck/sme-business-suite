import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDate } from "./formatters";

const LABELS = {
  en: {
    invoice: "Invoice",
    issueDate: "Issue Date",
    customerName: "Customer Name",
    customerEmail: "Customer Email",
    notes: "Notes",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit Price",
    vat: "VAT (5%)",
    lineTotal: "Line Total",
    subtotal: "Subtotal",
    vatAmount: "VAT Amount",
    total: "Total"
  },
  ar: {
    invoice: "فاتورة",
    issueDate: "تاريخ الإصدار",
    customerName: "اسم العميل",
    customerEmail: "بريد العميل",
    notes: "ملاحظات",
    description: "الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    vat: "ضريبة القيمة المضافة (5٪)",
    lineTotal: "الإجمالي",
    subtotal: "الإجمالي قبل الضريبة",
    vatAmount: "ضريبة القيمة المضافة",
    total: "الإجمالي النهائي"
  }
};

export function generateInvoicePdf(invoice, language = "en") {
  const labels = LABELS[language] || LABELS.en;
  const doc = new jsPDF({ orientation: "portrait" });

  doc.setFontSize(18);
  doc.text(labels.invoice, 14, 20);
  doc.setFontSize(11);

  doc.text(`${labels.issueDate}: ${formatDate(invoice.issueDate)}`, 14, 30);
  doc.text(`${labels.customerName}: ${invoice.customerName}`, 14, 36);
  if (invoice.customerEmail) {
    doc.text(`${labels.customerEmail}: ${invoice.customerEmail}`, 14, 42);
  }
  if (invoice.notes) {
    doc.text(`${labels.notes}: ${invoice.notes}`, 14, 48);
  }

  const tableBody = invoice.items.map((item) => [
    item.description,
    item.quantity,
    formatCurrency(item.unitPrice),
    formatCurrency(item.vatAmount),
    formatCurrency(item.lineTotal)
  ]);

  doc.autoTable({
    startY: 60,
    head: [
      [
        labels.description,
        labels.quantity,
        labels.unitPrice,
        labels.vat,
        labels.lineTotal
      ]
    ],
    body: tableBody
  });

  const summaryStart = doc.previousAutoTable.finalY + 10;
  doc.text(`${labels.subtotal}: ${formatCurrency(invoice.subtotal)}`, 14, summaryStart);
  doc.text(`${labels.vatAmount}: ${formatCurrency(invoice.vatAmount)}`, 14, summaryStart + 6);
  doc.text(`${labels.total}: ${formatCurrency(invoice.total)}`, 14, summaryStart + 12);

  doc.save(`invoice-${invoice.customerName}-${formatDate(invoice.issueDate)}.pdf`);
}

