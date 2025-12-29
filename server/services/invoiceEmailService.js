const { sendEmail } = require("./emailService");
const { generateInvoicePdf } = require("./pdfService");
const Company = require("../../models/Company");
const companyConfig = require("../config/company");

/**
 * Send invoice via email
 * @param {Object} invoice - Invoice data
 * @returns {Promise<void>}
 */
async function sendInvoiceEmail(invoice) {
  if (!invoice.customerEmail) {
    console.warn(`[Invoice Email] No email address for invoice ${invoice.invoiceNumber}`);
    return;
  }

  try {
    // Get company information from database
    let companyInfo = null;
    try {
      const company = await Company.findOne({ where: { companyId: 1 } });
      if (company) {
        const companyData = company.get({ plain: true });
        companyInfo = {
          name: companyData.name || companyData.shopName || "BizEase UAE",
          shopName: companyData.shopName || companyData.name || "BizEase UAE",
          address: companyData.address || "",
          phone: companyData.phone || "",
          email: companyData.email || "",
          trn: companyData.trn || ""
        };
      }
    } catch (companyError) {
      console.warn("[Invoice Email] Could not fetch company info:", companyError.message);
    }
    
    // Use company name from database if available, otherwise fallback to config
    const companyName = companyInfo?.name || companyInfo?.shopName || companyConfig.companyName;
    const companyEmail = companyInfo?.email || companyConfig.email;
    const companyPhone = companyInfo?.phone || companyConfig.phone;
    
    // Generate PDF with company info
    const pdfArrayBuffer = await generateInvoicePdf(invoice, companyInfo);
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const pdfBase64 = pdfBuffer.toString("base64");

    const isArabic = invoice.language === "ar";
    const subject = isArabic 
      ? `فاتورة ${invoice.invoiceNumber} من ${companyName}`
      : `Invoice ${invoice.invoiceNumber} from ${companyName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${invoice.language}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2980b9; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invoice-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #2980b9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isArabic ? "فاتورة جديدة" : "New Invoice"}</h1>
          </div>
          <div class="content">
            <p>${isArabic ? "عزيزي/عزيزتي" : "Dear"} ${invoice.customerName},</p>
            <p>${isArabic 
              ? "نود إعلامك بأنه تم إنشاء فاتورة جديدة لك. يرجى الاطلاع على التفاصيل المرفقة."
              : "We are pleased to inform you that a new invoice has been created for you. Please find the details attached."}</p>
            
            <div class="invoice-details">
              <p><strong>${isArabic ? "رقم الفاتورة:" : "Invoice Number:"}</strong> ${invoice.invoiceNumber}</p>
              <p><strong>${isArabic ? "تاريخ الإصدار:" : "Issue Date:"}</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
              ${invoice.dueDate ? `<p><strong>${isArabic ? "تاريخ الاستحقاق:" : "Due Date:"}</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ""}
              <p><strong>${isArabic ? "الإجمالي:" : "Total Amount:"}</strong> ${parseFloat(invoice.total || 0).toFixed(2)} ${invoice.currency || "AED"}</p>
              <p><strong>${isArabic ? "الحالة:" : "Status:"}</strong> ${invoice.status}</p>
            </div>

            <p>${isArabic 
              ? "يرجى مراجعة الفاتورة المرفقة والقيام بالدفع في أقرب وقت ممكن."
              : "Please review the attached invoice and make payment at your earliest convenience."}</p>
          </div>
          <div class="footer">
            <p>${isArabic ? "مع تحياتنا" : "Best regards"},</p>
            <p><strong>${companyName}</strong></p>
            <p>${companyEmail} | ${companyPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = isArabic
      ? `فاتورة جديدة\n\nرقم الفاتورة: ${invoice.invoiceNumber}\nالمبلغ: ${invoice.total} ${invoice.currency}\n\nيرجى الاطلاع على المرفق.`
      : `New Invoice\n\nInvoice Number: ${invoice.invoiceNumber}\nAmount: ${invoice.total} ${invoice.currency}\n\nPlease see attachment.`;

    await sendEmail({
      to: invoice.customerEmail,
      subject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf"
        }
      ]
    });

    console.log(`[Invoice Email] ✅ Invoice ${invoice.invoiceNumber} sent to ${invoice.customerEmail}`);
  } catch (error) {
    console.error(`[Invoice Email] ❌ Failed to send invoice ${invoice.invoiceNumber}:`, error);
    throw error;
  }
}

module.exports = { sendInvoiceEmail };

