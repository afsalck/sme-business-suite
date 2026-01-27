import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDate } from "./formatters";
import { 
  getPdfTranslations, 
  isRTL, 
  getTextAlign, 
  getRTLArray 
} from "./pdfTranslations";
import { 
  containsArabic, 
  processArabicText, 
  setDocumentFont,
  getFontName,
  setFontWithStyle
} from "./pdfFonts";

// Default company information (fallback if not provided)
const DEFAULT_COMPANY_INFO = {
  name: "BizEase UAE",
  address: "Dubai, United Arab Emirates",
  phone: "+971 XX XXX XXXX",
  email: "info@bizease.ae",
  trn: ""
};

// Helper to get company info (with fallback)
function getCompanyInfo(companyInfo) {
  return {
    name: companyInfo?.name || companyInfo?.shopName || DEFAULT_COMPANY_INFO.name,
    address: companyInfo?.address || DEFAULT_COMPANY_INFO.address,
    phone: companyInfo?.phone || DEFAULT_COMPANY_INFO.phone,
    email: companyInfo?.email || DEFAULT_COMPANY_INFO.email,
    trn: companyInfo?.trn || DEFAULT_COMPANY_INFO.trn
  };
}

// Helper to get X position based on RTL
function getXPosition(pageWidth, margin, isRtl, offset = 0) {
  return isRtl ? pageWidth - margin - offset : margin + offset;
}

// Helper to get text alignment for language
function getAlign(language) {
  return isRTL(language) ? "right" : "left";
}

// Helper function to add header with RTL support
async function addHeader(doc, labels, invoice, companyInfo, language, isReceipt = false) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const company = getCompanyInfo(companyInfo);
  const rtl = isRTL(language);
  const textAlign = getAlign(language);
  
  // Set font for language
  const { setDocumentFontSync } = await import("./pdfFonts");
  setDocumentFontSync(doc, language);
  
  // Header background
  doc.setFillColor(59, 130, 246); // Blue color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company name (left side for LTR, right side for RTL)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  setFontWithStyle(doc, language, 'bold');
  const companyX = rtl ? pageWidth - 14 : 14;
  doc.text(processArabicText(company.name), companyX, 20, { align: textAlign });
  
  // Document type (right side for LTR, left side for RTL)
  doc.setFontSize(16);
  const docTypeX = rtl ? 14 : pageWidth - 14;
  doc.text(processArabicText(isReceipt ? labels.receipt : labels.invoice), docTypeX, 20, { align: rtl ? "left" : "right" });
  
  // Invoice number
  if (invoice.invoiceNumber) {
    doc.setFontSize(12);
    const invoiceText = `${labels.invoiceNumber} ${invoice.invoiceNumber}`;
    doc.text(processArabicText(invoiceText), docTypeX, 30, { align: rtl ? "left" : "right" });
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 50; // Return Y position after header
}

// Helper function to add company and customer info with RTL support
async function addCompanyCustomerInfo(doc, labels, invoice, companyInfo, startY, language, isReceipt = false) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colWidth = (pageWidth - margin * 3) / 2;
  const company = getCompanyInfo(companyInfo);
  const rtl = isRTL(language);
  const textAlign = getAlign(language);
  
  const { setDocumentFontSync: setDocFont } = await import("./pdfFonts");
  setDocFont(doc, language);
  
  // Company info position (left for LTR, right for RTL)
  const companyX = rtl ? margin + colWidth + margin : margin;
  const customerX = rtl ? margin : margin + colWidth + margin;
  
  // Company info
  doc.setFontSize(10);
  setFontWithStyle(doc, language, 'bold');
  doc.text(processArabicText(`${labels.from}:`), companyX, startY, { align: textAlign });
  setFontWithStyle(doc, language, 'normal');
  doc.setFontSize(9);
  let currentY = startY + 6;
  doc.text(processArabicText(company.name), companyX, currentY, { align: textAlign });
  currentY += 6;
  
  if (company.address) {
    doc.text(processArabicText(company.address), companyX, currentY, { align: textAlign });
    currentY += 6;
  }
  if (company.phone) {
    doc.text(processArabicText(`${labels.phone}: ${company.phone}`), companyX, currentY, { align: textAlign });
    currentY += 6;
  }
  if (company.email) {
    doc.text(processArabicText(`${labels.email}: ${company.email}`), companyX, currentY, { align: textAlign });
    currentY += 6;
  }
  const trnToShow = invoice.supplierTRN || company.trn;
  if (trnToShow) {
    doc.text(processArabicText(`${labels.supplierTRN}: ${trnToShow}`), companyX, currentY, { align: textAlign });
    currentY += 6;
  }
  
  // Customer info (right side for LTR, left side for RTL)
  const customerStartY = startY;
  setFontWithStyle(doc, language, 'bold');
  doc.text(processArabicText(`${labels.customerName}:`), customerX, customerStartY, { align: textAlign });
  setFontWithStyle(doc, language, 'normal');
  doc.text(processArabicText(invoice.customerName || (rtl ? "عميل" : "Walk-in Customer")), customerX, customerStartY + 6, { align: textAlign });
  
  let customerY = customerStartY + 12;
  if (invoice.customerEmail) {
    doc.text(processArabicText(`${labels.customerEmail}: ${invoice.customerEmail}`), customerX, customerY, { align: textAlign });
    customerY += 6;
  }
  if (invoice.customerPhone) {
    doc.text(processArabicText(`${labels.customerPhone}: ${invoice.customerPhone}`), customerX, customerY, { align: textAlign });
    customerY += 6;
  }
  if (invoice.customerTRN) {
    doc.text(processArabicText(`${labels.customerTRN}: ${invoice.customerTRN}`), customerX, customerY, { align: textAlign });
    customerY += 6;
  }
  
  // Date info
  const dateY = Math.max(currentY, customerY);
  const dateText = `${labels.issueDate}: ${formatDate(invoice.issueDate || invoice.date || new Date())}`;
  doc.text(processArabicText(dateText), customerX, dateY, { align: textAlign });
  
  if (invoice.dueDate && !isReceipt) {
    const dueDateText = `${labels.dueDate}: ${formatDate(invoice.dueDate)}`;
    doc.text(processArabicText(dueDateText), customerX, dateY + 6, { align: textAlign });
  }
  
  return dateY + (invoice.dueDate && !isReceipt ? 12 : 6);
}

// Generate professional invoice PDF with full Arabic support
export async function generateInvoicePdf(invoice, language = "en", companyInfo = null) {
  let labels = getPdfTranslations(language);
  let rtl = isRTL(language);
  let textAlign = getAlign(language);
  
  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  
  // Set font for language (try to register Arabic font if needed)
  if (language === "ar") {
    const { registerArabicFont, setDocumentFontSync } = await import("./pdfFonts");
    await registerArabicFont(doc);
    setDocumentFontSync(doc, language);
  } else {
    const { setDocumentFontSync } = await import("./pdfFonts");
    setDocumentFontSync(doc, language);
  }
  
  // Add header
  let currentY = await addHeader(doc, labels, invoice, companyInfo, language, false);
  
  // Add company and customer info
  currentY = await addCompanyCustomerInfo(doc, labels, invoice, companyInfo, currentY + 5, language, false);
  
  // Prepare table data
  const tableBody = invoice.items.map((item) => {
    const description = item.description || item.name || "-";
    const row = [
      processArabicText(description),
      item.quantity || 1,
      formatCurrency(item.unitPrice || 0),
      item.discount > 0 ? formatCurrency(item.discount || 0) : "-",
      formatCurrency((item.lineTotal || item.total || (item.quantity || 1) * (item.unitPrice || 0)) - (item.discount || 0))
    ];
    // Reverse row for RTL
    return rtl ? getRTLArray(row, language) : row;
  });
  
  // Table headers - reverse for RTL
  const headers = [
    labels.description,
    labels.quantity,
    labels.unitPrice,
    labels.discount,
    labels.lineTotal
  ];
  const tableHeaders = rtl ? getRTLArray(headers, language) : headers;
  
  // Add items table
  const currentFont = getFontName(language);
  doc.autoTable({
    startY: currentY,
    head: [tableHeaders],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: language === "ar" ? 'normal' : 'bold',
      font: currentFont,
      halign: rtl ? 'right' : 'left'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: rtl ? 'right' : 'left',
      font: currentFont,
      fontStyle: 'normal'
    },
    columnStyles: rtl ? {
      4: { cellWidth: 'auto', halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      1: { cellWidth: 20, halign: 'center' },
      0: { cellWidth: 'auto', halign: 'right' }
    } : {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });
  
  // Get position after table
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Add totals section - position based on RTL
  const totalsX = rtl ? margin : pageWidth - margin - 80;
  const totalsValueX = rtl ? margin + 80 : pageWidth - margin;
  
  // Subtotal
  doc.setFontSize(10);
  doc.text(processArabicText(`${labels.subtotal}:`), totalsX, currentY, { align: textAlign });
  doc.text(formatCurrency(invoice.subtotal || invoice.totalSales || 0), totalsValueX, currentY, { align: rtl ? "left" : "right" });
  currentY += 6;
  
  // Discount
  if (invoice.totalDiscount > 0) {
    doc.setTextColor(220, 38, 38); // Red for discount
    doc.text(processArabicText(`${labels.totalDiscount}:`), totalsX, currentY, { align: textAlign });
    doc.text(`-${formatCurrency(invoice.totalDiscount)}`, totalsValueX, currentY, { align: rtl ? "left" : "right" });
    doc.setTextColor(0, 0, 0);
    currentY += 6;
  }
  
  // VAT
  doc.setFontSize(10);
  doc.text(processArabicText(`${labels.vatAmount}:`), totalsX, currentY, { align: textAlign });
  doc.text(formatCurrency(invoice.vatAmount || invoice.totalVAT || 0), totalsValueX, currentY, { align: rtl ? "left" : "right" });
  currentY += 8;
  
  // Total
  doc.setFontSize(14);
  setFontWithStyle(doc, language, 'bold');
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255, 255, 255);
  const totalRectX = rtl ? margin : totalsX - 5;
  doc.roundedRect(totalRectX, currentY - 8, 85, 10, 2, 2, 'F');
  doc.text(processArabicText(`${labels.total}:`), totalsX, currentY, { align: textAlign });
  doc.text(formatCurrency(invoice.total || invoice.totalWithVAT || invoice.grandTotal || 0), totalsValueX, currentY, { align: rtl ? "left" : "right" });
  doc.setTextColor(0, 0, 0);
  currentY += 15;
  
  // Payment terms
  if (invoice.paymentTerms && !invoice.paymentTerms.includes("immediate")) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    let paymentTermsText = invoice.paymentTerms;
    if (rtl) {
      // Replace "X days" or "X day" with "X يومًا"
      paymentTermsText = paymentTermsText.replace(/(\d+)\s*days?/gi, "$1 يومًا");
    }
    doc.text(processArabicText(`${labels.paymentTerms}: ${paymentTermsText}`), rtl ? pageWidth - margin : margin, currentY, { align: textAlign });
    currentY += 6;
  }
  
  // Notes
  if (invoice.notes) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(processArabicText(`${labels.notes}:`), rtl ? pageWidth - margin : margin, currentY, { align: textAlign });
    doc.setFont(undefined, 'normal');
    const splitNotes = doc.splitTextToSize(processArabicText(invoice.notes), pageWidth - margin * 2);
    doc.text(splitNotes, rtl ? pageWidth - margin : margin, currentY + 6, { align: textAlign });
    currentY += 6 + (splitNotes.length * 5);
  }
  
  // Thank you message
  if (currentY < pageHeight - 20) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(processArabicText(labels.thankYou), rtl ? pageWidth - margin : margin, pageHeight - 10, { align: textAlign });
  }
  
  // Footer
  const company = getCompanyInfo(companyInfo);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerText = `${labels.generatedBy} ${company.name}`;
  doc.text(processArabicText(footerText), pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  // Save PDF
  const fileName = invoice.invoiceNumber 
    ? `invoice-${invoice.invoiceNumber}.pdf`
    : `invoice-${invoice.customerName || 'customer'}-${formatDate(invoice.issueDate || invoice.date || new Date())}.pdf`;
  doc.save(fileName);
}

// Generate POS receipt with full Arabic support
export async function generateReceiptPdf(sale, language = "en", companyInfo = null) {
  try {
    console.log('[POS Receipt] Starting PDF generation...', { saleId: sale?.id, language });
    
    let actualLanguage = language;
    let labels = getPdfTranslations(actualLanguage);
    let rtl = isRTL(actualLanguage);
    let textAlign = getAlign(actualLanguage);
    
    const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const company = getCompanyInfo(companyInfo);
    
    console.log('[POS Receipt] PDF document created, page size:', pageWidth, 'x', pageHeight);
    
    // Set font for language (try to register Arabic font if needed)
    let fontLoaded = false;
    let useEnglishFallback = false;
    
    if (actualLanguage === "ar") {
      console.log('[POS Receipt] Loading Arabic font...');
      const { registerArabicFont, setDocumentFontSync, getFontName } = await import("./pdfFonts");
      fontLoaded = await registerArabicFont(doc);
      
      if (!fontLoaded) {
        console.warn('[POS Receipt] ⚠️ Arabic font not available. Using English labels to prevent garbled text.');
        useEnglishFallback = true;
        actualLanguage = "en"; // Switch to English for labels
        labels = getPdfTranslations("en");
        rtl = false;
        textAlign = "left";
      } else {
        setDocumentFontSync(doc, actualLanguage);
        const fontName = getFontName(actualLanguage);
        console.log('[POS Receipt] Arabic font loaded:', fontLoaded, 'Font name:', fontName);
        // Ensure font is set before proceeding
        try {
          doc.setFont(fontName, 'normal');
          console.log('[POS Receipt] Font set successfully:', fontName);
        } catch (e) {
          console.error('[POS Receipt] Failed to set font:', e);
          fontLoaded = false;
          useEnglishFallback = true;
          actualLanguage = "en";
          labels = getPdfTranslations("en");
          rtl = false;
          textAlign = "left";
        }
      }
    } else {
      const { setDocumentFontSync } = await import("./pdfFonts");
      setDocumentFontSync(doc, actualLanguage);
      console.log('[POS Receipt] Using English font (helvetica)');
    }
  
    // Add header
    let currentY = await addHeader(doc, labels, { invoiceNumber: `SALE-${sale.id || sale._id || 'N/A'}` }, companyInfo, actualLanguage, true);
  
    // Add company info - position based on RTL
    const companyX = rtl ? pageWidth - margin : margin;
  doc.setFontSize(10);
  setFontWithStyle(doc, actualLanguage, 'bold');
  doc.text(processArabicText(company.name), companyX, currentY, { align: textAlign });
  setFontWithStyle(doc, actualLanguage, 'normal');
  doc.setFontSize(9);
  let infoY = currentY + 6;
  
  if (company.address) {
    doc.text(processArabicText(company.address), companyX, infoY, { align: textAlign });
    infoY += 6;
  }
  if (company.phone) {
    doc.text(processArabicText(`${labels.phone}: ${company.phone}`), companyX, infoY, { align: textAlign });
    infoY += 6;
  }
  if (company.email) {
    doc.text(processArabicText(`${labels.email}: ${company.email}`), companyX, infoY, { align: textAlign });
    infoY += 6;
  }
  if (company.trn) {
    doc.text(processArabicText(`${labels.trn}: ${company.trn}`), companyX, infoY, { align: textAlign });
    infoY += 6;
  }
  
  // Date and time
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const dateText = `${labels.issueDate}: ${formatDate(saleDate)} ${saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(processArabicText(dateText), companyX, infoY, { align: textAlign });
  infoY += 6;
  
  if (sale.summary) {
    const summaryText = (rtl && !useEnglishFallback) ? `بيع: ${sale.summary}` : `Sale: ${sale.summary}`;
    doc.text(processArabicText(summaryText), companyX, infoY, { align: textAlign });
    infoY += 6;
  }
  
  currentY = infoY + 8;
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;
  
  // Items table
  const items = Array.isArray(sale.items) ? sale.items : [];
  const tableBody = items.map((item) => {
    const description = (item.name || item.description || item.item?.name || "-").substring(0, 30);
    const row = [
      processArabicText(description),
      item.quantity || 1,
      formatCurrency(item.unitPrice || item.item?.salePrice || 0),
      formatCurrency((item.total || item.lineTotal || (item.quantity || 1) * (item.unitPrice || item.item?.salePrice || 0)))
    ];
    return (rtl && !useEnglishFallback) ? getRTLArray(row, actualLanguage) : row;
  });
  
  // Table headers - reverse for RTL only if Arabic font is loaded
  const headers = [
    labels.description,
    labels.quantity,
    labels.unitPrice,
    labels.lineTotal
  ];
  const tableHeaders = (rtl && !useEnglishFallback) ? getRTLArray(headers, actualLanguage) : headers;
  
  if (tableBody.length > 0) {
    const currentFont = getFontName(actualLanguage);
    console.log('[POS Receipt] Using font for table:', currentFont, 'Language:', actualLanguage);
    
    // Ensure font is set before creating table
    if (actualLanguage === "ar" && fontLoaded) {
      try {
        doc.setFont(currentFont, 'normal');
      } catch (e) {
        console.error('[POS Receipt] Error setting font before table:', e);
      }
    }
    
    doc.autoTable({
      startY: currentY,
      head: [tableHeaders],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: actualLanguage === "ar" ? 'normal' : 'bold',
        font: currentFont,
        halign: rtl ? 'right' : 'left',
        lineWidth: 0.1
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineWidth: 0.1,
        halign: rtl ? 'right' : 'left',
        font: currentFont,
        fontStyle: 'normal'
      },
      didParseCell: function(data) {
        // Ensure Arabic font is used in all cells
        if (actualLanguage === "ar" && fontLoaded) {
          data.cell.styles.font = currentFont;
          data.cell.styles.fontStyle = 'normal';
          // Process Arabic text in cells
          if (data.cell.text && typeof data.cell.text === 'string') {
            // processArabicText is already imported at top level
            data.cell.text = processArabicText(data.cell.text);
          }
        }
      },
      willDrawCell: function(data) {
        // Ensure font is set when drawing
        if (actualLanguage === "ar" && fontLoaded) {
          try {
            doc.setFont(currentFont, 'normal');
          } catch (e) {
            // Ignore
          }
        }
      },
      columnStyles: rtl ? {
        3: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        1: { cellWidth: 20, halign: 'center' },
        0: { cellWidth: 'auto', halign: 'right' }
      } : {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });
    
    currentY = doc.lastAutoTable.finalY + 8;
  }
  
  // Divider line
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;
  
  // Totals - position based on RTL
  const totalsX = rtl ? margin : pageWidth - margin - 60;
  const totalsValueX = rtl ? margin + 60 : pageWidth - margin;
  doc.setFontSize(10);
  
  // Subtotal
  const subtotal = sale.totalSales || sale.subtotal || 0;
  doc.text(processArabicText(`${labels.subtotal}:`), totalsX, currentY, { align: textAlign });
  doc.text(formatCurrency(subtotal), totalsValueX, currentY, { align: rtl ? "left" : "right" });
  currentY += 6;
  
  // VAT
  const vatAmount = sale.totalVAT || sale.vatAmount || 0;
  if (vatAmount > 0) {
    doc.text(processArabicText(`${labels.vatAmount}:`), totalsX, currentY, { align: textAlign });
    doc.text(formatCurrency(vatAmount), totalsValueX, currentY, { align: rtl ? "left" : "right" });
    currentY += 6;
  }
  
  // Total
  const grandTotal = sale.grandTotal || sale.total || (subtotal + vatAmount);
  doc.setFontSize(14);
  setFontWithStyle(doc, actualLanguage, 'bold');
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255, 255, 255);
  const totalRectX = rtl ? margin : totalsX - 5;
  doc.roundedRect(totalRectX, currentY - 2, 65, 10, 2, 2, 'F');
  doc.text(processArabicText(`${labels.total}:`), totalsX, currentY + 4, { align: textAlign });
  doc.text(formatCurrency(grandTotal), totalsValueX, currentY + 4, { align: rtl ? "left" : "right" });
  doc.setTextColor(0, 0, 0);
  currentY += 15;
  
  // Notes
  if (sale.notes) {
    doc.setFontSize(9);
    setFontWithStyle(doc, actualLanguage, 'normal');
    doc.text(processArabicText(`${labels.notes}: ${sale.notes}`), rtl ? pageWidth - margin : margin, currentY, { align: textAlign });
    currentY += 8;
  }
  
  // Thank you message
  doc.setFontSize(10);
  setFontWithStyle(doc, actualLanguage, 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(processArabicText(labels.thankYou), rtl ? pageWidth - margin : margin, currentY + 10, { align: textAlign });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const receiptText = (rtl && !useEnglishFallback) ? `إيصال #${sale.id}` : `Receipt #${sale.id}`;
  doc.text(receiptText, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
    // Save PDF
    try {
      const fileName = `receipt-${sale.id}-${formatDate(saleDate)}.pdf`;
      console.log('[POS Receipt] Attempting to save PDF:', fileName);
      doc.save(fileName);
      console.log('[POS Receipt] ✅ PDF saved successfully:', fileName);
    } catch (error) {
      console.error('[POS Receipt] ❌ Error saving PDF:', error);
      console.error('[POS Receipt] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  } catch (error) {
    console.error('[POS Receipt] ❌ Fatal error in PDF generation:', error);
    console.error('[POS Receipt] Error stack:', error.stack);
    throw error;
  }
}
