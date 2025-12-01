// jsPDF v3.x CommonJS import fix
const { jsPDF } = require("jspdf");
// jspdf-autotable v5.x with jsPDF v3.x
// Try different import methods
let autoTable;
try {
  const autotableModule = require("jspdf-autotable");
  // Check if it's a function, default export, or has a specific property
  if (typeof autotableModule === 'function') {
    autoTable = autotableModule;
  } else if (autotableModule.default && typeof autotableModule.default === 'function') {
    autoTable = autotableModule.default;
  } else if (autotableModule.autoTable && typeof autotableModule.autoTable === 'function') {
    autoTable = autotableModule.autoTable;
  } else {
    // Fallback: try to use it as-is
    autoTable = autotableModule;
  }
} catch (e) {
  console.error("[PDF Service] Error loading jspdf-autotable:", e);
  autoTable = null;
}

const dayjs = require("dayjs");
const companyConfig = require("../config/company");

/**
 * Generate professional invoice PDF
 * @param {Object} invoice - Invoice data
 * @returns {Buffer} PDF buffer
 */
async function generateInvoicePdf(invoice) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  
  // Manually add autoTable method if plugin didn't extend prototype
  if (typeof doc.autoTable !== 'function') {
    if (typeof autoTable === 'function') {
      // Wrap it as a method on the doc
      doc.autoTable = function(options) {
        return autoTable(doc, options);
      };
    } else {
      throw new Error("jspdf-autotable plugin not loaded correctly. autoTable is not a function.");
    }
  }
  
  const isArabic = invoice.language === "ar";
  
  // Set RTL if Arabic
  if (isArabic) {
    doc.setR2L(true);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Header Section
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(isArabic ? "فاتورة" : "INVOICE", pageWidth - margin, yPos, { align: isArabic ? "right" : "left" });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`# ${invoice.invoiceNumber}`, pageWidth - margin, yPos, { align: isArabic ? "right" : "left" });

  // Company Details (Right side for English, Left for Arabic)
  yPos = margin;
  const companyX = isArabic ? margin : pageWidth - margin;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(companyConfig.companyName, companyX, yPos, { align: isArabic ? "left" : "right" });
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyConfig.address, companyX, yPos, { align: isArabic ? "left" : "right" });
  
  yPos += 5;
  doc.text(`${isArabic ? "TRN:" : "TRN:"} ${companyConfig.trn}`, companyX, yPos, { align: isArabic ? "left" : "right" });
  
  yPos += 5;
  doc.text(`${isArabic ? "البريد:" : "Email:"} ${companyConfig.email}`, companyX, yPos, { align: isArabic ? "left" : "right" });
  
  yPos += 5;
  doc.text(`${isArabic ? "الهاتف:" : "Phone:"} ${companyConfig.phone}`, companyX, yPos, { align: isArabic ? "left" : "right" });

  // Customer Details
  yPos = 50;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(isArabic ? "بيانات العميل" : "Bill To:", margin, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customerName, margin, yPos);
  
  if (invoice.customerEmail) {
    yPos += 5;
    doc.text(`${isArabic ? "البريد:" : "Email:"} ${invoice.customerEmail}`, margin, yPos);
  }
  
  if (invoice.customerPhone) {
    yPos += 5;
    doc.text(`${isArabic ? "الهاتف:" : "Phone:"} ${invoice.customerPhone}`, margin, yPos);
  }

  // Invoice Details
  yPos = 50;
  const detailsX = pageWidth - margin;
  doc.setFontSize(9);
  doc.text(`${isArabic ? "تاريخ الإصدار:" : "Issue Date:"} ${dayjs(invoice.issueDate).format("YYYY-MM-DD")}`, detailsX, yPos, { align: "right" });
  
  if (invoice.dueDate) {
    yPos += 5;
    doc.text(`${isArabic ? "تاريخ الاستحقاق:" : "Due Date:"} ${dayjs(invoice.dueDate).format("YYYY-MM-DD")}`, detailsX, yPos, { align: "right" });
  }
  
  if (invoice.paymentTerms) {
    yPos += 5;
    doc.text(`${isArabic ? "شروط الدفع:" : "Payment Terms:"} ${invoice.paymentTerms}`, detailsX, yPos, { align: "right" });
  }

  // Items Table
  const tableStartY = yPos + 15;
  const tableData = invoice.items.map((item) => [
    item.description || "",
    item.quantity || 0,
    parseFloat(item.unitPrice || 0).toFixed(2),
    parseFloat(item.discount || 0).toFixed(2),
    parseFloat(item.vatAmount || 0).toFixed(2),
    parseFloat(item.lineTotal || 0).toFixed(2)
  ]);

  // Use autoTable plugin - it extends jsPDF prototype
  doc.autoTable({
    startY: tableStartY,
    head: [[
      isArabic ? "الوصف" : "Description",
      isArabic ? "الكمية" : "Qty",
      isArabic ? "سعر الوحدة" : "Unit Price",
      isArabic ? "الخصم" : "Discount",
      isArabic ? "الضريبة" : "VAT",
      isArabic ? "الإجمالي" : "Total"
    ]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "right" }
    }
  });

  // Summary Section
  // Get final Y position from doc.lastAutoTable
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : tableStartY + (tableData.length * 8) + 20;
  let summaryY = finalY;
  const summaryX = pageWidth - margin - 60;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${isArabic ? "المجموع الفرعي:" : "Subtotal:"}`, summaryX, summaryY, { align: "right" });
  doc.text(parseFloat(invoice.subtotal || 0).toFixed(2) + " AED", pageWidth - margin, summaryY, { align: "right" });
  
  if (invoice.totalDiscount > 0) {
    summaryY += 5;
    doc.text(`${isArabic ? "الخصم:" : "Discount:"}`, summaryX, summaryY, { align: "right" });
    doc.text(parseFloat(invoice.totalDiscount || 0).toFixed(2) + " AED", pageWidth - margin, summaryY, { align: "right" });
  }
  
  summaryY += 5;
  doc.text(`${isArabic ? "ضريبة القيمة المضافة (5%):" : "VAT (5%):"}`, summaryX, summaryY, { align: "right" });
  doc.text(parseFloat(invoice.vatAmount || 0).toFixed(2) + " AED", pageWidth - margin, summaryY, { align: "right" });
  
  summaryY += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${isArabic ? "الإجمالي:" : "Grand Total:"}`, summaryX, summaryY, { align: "right" });
  doc.text(parseFloat(invoice.total || 0).toFixed(2) + " AED", pageWidth - margin, summaryY, { align: "right" });

  // Notes Section
  if (invoice.notes) {
    summaryY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(isArabic ? "ملاحظات:" : "Notes:", margin, summaryY);
    
    summaryY += 6;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, summaryY);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `${isArabic ? "شكراً لعملك معنا" : "Thank you for your business!"}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return doc.output("arraybuffer");
}

module.exports = { generateInvoicePdf };

