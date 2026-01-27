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
const fs = require("fs");
const path = require("path");

// Arabic text shaping library
let arabicReshaper;
try {
  arabicReshaper = require("arabic-reshaper");
} catch (e) {
  console.warn("[PDF Service] arabic-reshaper not available, Arabic text may not shape correctly");
  arabicReshaper = null;
}

// Helper function to check if text contains Arabic characters
function containsArabic(text) {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Helper function to fix Arabic text shaping
// Note: We do NOT use jsPDF's setR2L() mode because it causes text reversal issues
// Instead, we shape the text properly and handle alignment manually
function fixArabic(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Check if text contains Arabic characters
  if (!containsArabic(text)) {
    return text;
  }
  
  // Use arabic-reshaper if available
  // Note: arabic-reshaper exports 'convertArabic', not 'reshape'
  if (arabicReshaper && typeof arabicReshaper.convertArabic === 'function') {
    try {
      // Shape the Arabic text for proper rendering
      return arabicReshaper.convertArabic(text);
    } catch (e) {
      console.warn("[PDF Service] Error reshaping Arabic text:", e.message);
      return text;
    }
  }
  
  // Fallback: return text as-is if reshaper not available
  return text;
}

// Helper function to load Arabic font (if available)
async function loadArabicFont(doc) {
  try {
    // Try to load a font file if it exists
    // Check for common Arabic font names
    const fontNames = [
      "NotoSansArabic-Regular-normal.js",
      "NotoSansArabic-normal.js",
      "ArabicFont-normal.js"
    ];
    
    for (const fontName of fontNames) {
      const fontPath = path.join(__dirname, "../fonts", fontName);
      if (fs.existsSync(fontPath)) {
        try {
          // Read the font file as text to extract the base64 data
          const fontFileContent = fs.readFileSync(fontPath, 'utf8');
          
          // Extract the base64 font data from the file
          // The format is: var font = 'base64data...';
          let fontData = null;
          
          // Try to require the font file as a module first (if it exports properly)
          try {
            delete require.cache[require.resolve(fontPath)];
            const fontModule = require(fontPath);
            if (typeof fontModule === 'string' && fontModule.length > 100) {
              fontData = fontModule;
            } else if (fontModule && typeof fontModule.default === 'string' && fontModule.default.length > 100) {
              fontData = fontModule.default;
            } else if (fontModule && typeof fontModule.font === 'string' && fontModule.font.length > 100) {
              fontData = fontModule.font;
            }
          } catch (requireError) {
            // If require fails, use regex extraction
            console.log(`[PDF Service] Could not require font file, trying regex extraction`);
          }
          
          // If require didn't work, try regex patterns
          if (!fontData) {
            // Try to match var font = '...' pattern (handles both single and double quotes)
            // Also handle multi-line strings
            const patterns = [
              /var\s+font\s*=\s*['"]([^'"]{100,})['"]/s,  // Single line with s flag for dotall
              /const\s+font\s*=\s*['"]([^'"]{100,})['"]/s,
              /let\s+font\s*=\s*['"]([^'"]{100,})['"]/s,
              /font\s*=\s*['"]([^'"]{100,})['"]/s,
              // Try to find any long base64-like string
              /['"]([A-Za-z0-9+/=]{500,})['"]/s
            ];
            
            for (const pattern of patterns) {
              const match = fontFileContent.match(pattern);
              if (match && match[1] && match[1].length > 100) {
                fontData = match[1];
                console.log(`[PDF Service] Extracted font data using regex, length: ${fontData.length}`);
                break;
              }
            }
          }
          
          if (fontData) {
            console.log(`[PDF Service] Successfully extracted font data, length: ${fontData.length}`);
          }
          
          if (fontData) {
            const fontFileName = "NotoSansArabic-Regular-normal.ttf";
            // Try multiple font family names to find the one that works
            const fontFamilyNames = ["NotoSansArabic-Regular", "NotoSansArabic", "NotoSans"];
            
            try {
              doc.addFileToVFS(fontFileName, fontData);
              
              // Try each font family name until one works
              for (const fontFamilyName of fontFamilyNames) {
                try {
                  doc.addFont(fontFileName, fontFamilyName, "normal");
                  // Verify the font was added by trying to use it
                  try {
                    doc.setFont(fontFamilyName, "normal");
                    console.log(`✅ [PDF Service] Successfully loaded Arabic font: ${fontName} as "${fontFamilyName}"`);
                    // Store the working font name for later use
                    doc._arabicFontName = fontFamilyName;
                    return true;
                  } catch (verifyError) {
                    console.warn(`[PDF Service] Font added but verification failed: ${verifyError.message}`);
                    continue;
                  }
                } catch (addFontError) {
                  // Try next font name
                  continue;
                }
              }
              
              // If all font names failed, log error
              console.warn(`[PDF Service] Failed to add font with any of the font family names: ${fontFamilyNames.join(", ")}`);
            } catch (vfsError) {
              console.warn(`[PDF Service] Error adding font to VFS:`, vfsError.message);
            }
          } else {
            console.warn(`[PDF Service] Could not extract font data from ${fontName}`);
          }
        } catch (fontError) {
          console.warn(`[PDF Service] Error loading font file ${fontName}:`, fontError.message);
          continue;
        }
      }
    }
  } catch (error) {
    console.warn("[PDF Service] Could not load Arabic font file:", error.message);
  }
  return false;
}

/**
 * Generate professional invoice PDF
 * @param {Object} invoice - Invoice data
 * @returns {Buffer} PDF buffer
 */
async function generateInvoicePdf(invoice, companyInfo = null) {
  // Ensure language is set, default to 'en'
  if (!invoice.language) {
    invoice.language = 'en';
  }
  const isArabic = invoice.language === "ar";
  
  // Get company information - for invoices, use formal company name (not shopName)
  // Use database company info if available, otherwise fallback to config
  console.log("[Invoice PDF] companyInfo received:", JSON.stringify(companyInfo, null, 2));
  console.log("[Invoice PDF] companyInfo?.name:", companyInfo?.name, "Type:", typeof companyInfo?.name);
  console.log("[Invoice PDF] companyConfig.companyName:", companyConfig.companyName);
  
  const companyName = companyInfo?.name || companyInfo?.shopName || companyConfig.companyName;
  const companyAddress = companyInfo?.address || companyConfig.address;
  const companyPhone = companyInfo?.phone || companyConfig.phone;
  const companyEmail = companyInfo?.email || companyConfig.email;
  const companyTrn = companyInfo?.trn || companyConfig.trn;
  
  console.log("[Invoice PDF] Final company name to use:", companyName, "from:", companyInfo?.name ? "database (name)" : companyInfo?.shopName ? "database (shopName)" : "config");
  console.log("[Invoice PDF] Company name details - Value:", companyName, "Length:", companyName?.length, "Is empty:", !companyName || companyName.trim() === "");
  
  // Create PDF document
  // NOTE: We do NOT use setR2L() because it causes text reversal issues with shaped Arabic text
  // Instead, we handle RTL alignment manually
  const doc = new jsPDF({ 
    orientation: "portrait", 
    unit: "mm",
    compress: true
  });
  
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
  
  // Try to load Arabic font if needed
  let hasArabicFont = false;
  if (isArabic) {
    hasArabicFont = await loadArabicFont(doc);
    if (!hasArabicFont) {
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("⚠️  ARABIC FONT NOT FOUND");
      console.warn("Arabic text will not display correctly in PDFs.");
      console.warn("");
      console.warn("📋 Quick Fix:");
      console.warn("1. See ARABIC_FONT_SETUP.md for instructions");
      console.warn("2. Or run: npm run setup-arabic-font");
      console.warn("3. Add NotoSansArabic-Regular-normal.js to server/fonts/");
      console.warn("4. Restart the server");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  }
  
  // Use Arabic font if available, otherwise fallback to helvetica
  // If Arabic font is not available, use English to prevent text corruption
  // Use the font name that was successfully registered, or try common names
  let fontFamily = "helvetica";
  let actualUseArabic = false;
  
  if (isArabic && hasArabicFont) {
    // Try to use the stored font name, or try common names
    const fontCandidates = [
      doc._arabicFontName,  // The one that was successfully registered
      "NotoSansArabic-Regular",
      "NotoSansArabic",
      "NotoSans"
    ].filter(Boolean); // Remove undefined values
    
    // Find which font name actually works
    for (const candidate of fontCandidates) {
      try {
        doc.setFont(candidate, "normal");
        fontFamily = candidate;
        actualUseArabic = true;
        console.log(`[PDF Service] Using Arabic font: ${candidate}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!actualUseArabic) {
      console.warn("[PDF Service] Arabic font not available, falling back to helvetica");
      fontFamily = "helvetica";
    }
  }
  
  // Update useArabic flag based on actual font availability
  const finalUseArabic = actualUseArabic;
  
  // NOTE: We do NOT use setR2L() - we handle RTL alignment manually
  
  // Helper function to set font - custom fonts only support 'normal' style
  const setFontSafe = (style = "normal") => {
    try {
      if (finalUseArabic) {
        // For Arabic fonts, only 'normal' is available - always use it
        doc.setFont(fontFamily, "normal");
      } else {
        // For built-in fonts, we can use bold/italic/normal
        doc.setFont(fontFamily, style);
      }
    } catch (fontError) {
      // Fallback to helvetica if font setting fails
      console.warn(`[PDF Service] Error setting font ${fontFamily}, falling back to helvetica: ${fontError.message}`);
      doc.setFont("helvetica", style);
    }
  };
  
  // Helper to render text with proper font setting for Arabic
  const renderText = (text, x, y, options = {}) => {
    // Ensure font is set before rendering, especially for Arabic
    if (finalUseArabic) {
      // Shape Arabic text before rendering
      text = fixArabic(text);
      doc.setFont(fontFamily, "normal");
    }
    doc.text(text, x, y, options);
  };
  
  // Helper to render numbers/currency (always LTR, even in RTL context)
  const renderNumber = (value, x, y, options = {}) => {
    if (finalUseArabic) {
      doc.setFont(fontFamily, "normal");
      // Use Unicode Left-to-Right Mark (LRM) to force LTR direction for numbers
      const lrm = '\u200E';  // Left-to-Right Mark
      const numberText = lrm + value + lrm;
      doc.text(numberText, x, y, options);
    } else {
      doc.text(value, x, y, options);
    }
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  // Compact margins for better space utilization
  const margin = finalUseArabic ? 8 : 8;
  const rightMargin = finalUseArabic ? 8 : 8;
  let yPos = 15; // Start a bit lower to ensure visibility

  // Company Details - Centered layout (render FIRST so it's at the top)
  const companyX = pageWidth / 2;
  const companyAlign = "center"; // Center-align for both
  let companyYPos = 15; // Start position for company section
  doc.setFontSize(12); // Company name font size
  setFontSafe("bold");
  doc.setTextColor(0, 0, 0); // Ensure text color is black
  console.log("[Invoice PDF] Rendering company name:", companyName, "at position:", companyX, companyYPos);
  if (finalUseArabic) {
    renderText(companyName, companyX, companyYPos, { align: companyAlign });
  } else {
    // Ensure font is set for English text
    setFontSafe("bold");
    const textToRender = companyName || "Company Name";
    console.log("[Invoice PDF] Rendering English text:", textToRender);
    doc.text(textToRender, companyX, companyYPos, { align: companyAlign });
  }
  
  companyYPos += 6; // Increased space after company name for better clarity
  
  // Header Section - Right side (render at same time as company details, but on the right)
  setFontSafe("bold");
  doc.setFontSize(16); // Reduced from 20
  const headerX = pageWidth - rightMargin;
  const headerText = finalUseArabic ? fixArabic("فاتورة") : "INVOICE";
  renderText(headerText, headerX, yPos, { align: "right" });
  
  yPos += 6; // Reduced from 10
  doc.setFontSize(8); // Reduced from 10
  setFontSafe("normal");
  const invoiceNumberLabel = finalUseArabic ? fixArabic("رقم الفاتورة") : "Invoice #";
  renderText(`${invoiceNumberLabel}: ${invoice.invoiceNumber}`, headerX, yPos, { align: "right" });
  
  // Continue with company address and other details below company name
  doc.setFontSize(8); // Increased from 7 for better clarity
  setFontSafe("normal");
  doc.setTextColor(0, 0, 0); // Ensure text color is black
  
  // Handle multi-line address properly
  if (companyAddress) {
    const addressLines = companyAddress.split('\n').filter(line => line.trim());
    addressLines.forEach((line, index) => {
      if (line.trim()) {
        if (finalUseArabic) {
          renderText(line.trim(), companyX, companyYPos, { align: companyAlign });
        } else {
          setFontSafe("normal");
          doc.text(line.trim(), companyX, companyYPos, { align: companyAlign });
        }
        companyYPos += 4; // Increased spacing between address lines
      }
    });
    companyYPos += 2; // Extra space after address block
  }
  
  if (companyTrn) {
    companyYPos += 1; // Space before TRN
    if (finalUseArabic) {
      renderText(`TRN: ${companyTrn}`, companyX, companyYPos, { align: companyAlign });
    } else {
      setFontSafe("normal");
      doc.text(`TRN: ${companyTrn}`, companyX, companyYPos, { align: companyAlign });
    }
    companyYPos += 5; // Increased spacing after TRN
  }
  
  if (companyEmail) {
    const emailLabel = finalUseArabic ? fixArabic("البريد الإلكتروني") : "Email";
    if (finalUseArabic) {
      renderText(`${emailLabel}: ${companyEmail}`, companyX, companyYPos, { align: companyAlign });
    } else {
      setFontSafe("normal");
      doc.text(`${emailLabel}: ${companyEmail}`, companyX, companyYPos, { align: companyAlign });
    }
    companyYPos += 5; // Increased spacing after Email
  }
  
  if (companyPhone) {
    const phoneLabel = finalUseArabic ? fixArabic("رقم الهاتف") : "Phone";
    if (finalUseArabic) {
      renderText(`${phoneLabel}: ${companyPhone}`, companyX, companyYPos, { align: companyAlign });
    } else {
      setFontSafe("normal");
      doc.text(`${phoneLabel}: ${companyPhone}`, companyX, companyYPos, { align: companyAlign });
    }
    companyYPos += 3; // Space after Phone
  }
  
  // Update yPos to be after company section for next content
  yPos = Math.max(yPos, companyYPos + 5);

  // Customer Details - Compact layout
  yPos = 40; // Reduced from 50
  const customerX = finalUseArabic ? pageWidth - rightMargin : margin;
  const customerAlign = finalUseArabic ? "right" : "left";
  doc.setFontSize(9); // Reduced from 11
  setFontSafe("bold");
  const billToLabel = finalUseArabic ? fixArabic("بيانات العميل") : "Bill To";
  renderText(`${billToLabel}:`, customerX, yPos, { align: customerAlign });
  
  yPos += 4; // Reduced from 6
  doc.setFontSize(7); // Reduced from 9
  setFontSafe("normal");
  const customerName = finalUseArabic ? fixArabic(invoice.customerName) : invoice.customerName;
  renderText(customerName, customerX, yPos, { align: customerAlign });
  
  if (invoice.customerEmail) {
    yPos += 3.5; // Reduced from 5
    const emailLabel = finalUseArabic ? fixArabic("البريد الإلكتروني") : "Email";
    renderText(`${emailLabel}: ${invoice.customerEmail}`, customerX, yPos, { align: customerAlign });
  }
  
  if (invoice.customerPhone) {
    yPos += 3.5; // Reduced from 5
    const phoneLabel = finalUseArabic ? fixArabic("رقم الهاتف") : "Phone";
    renderText(`${phoneLabel}: ${invoice.customerPhone}`, customerX, yPos, { align: customerAlign });
  }

  // Invoice Details - Compact layout
  yPos = 40; // Reduced from 50
  // For Arabic: details on left side but positioned more to the right to avoid cutoff, right-aligned
  // For English: details on right side, right-aligned
  const detailsX = finalUseArabic ? margin + 30 : pageWidth - rightMargin;
  const detailsAlign = "right"; // Always right-align for both
  doc.setFontSize(7); // Reduced from 9
  setFontSafe("normal");
  
  const issueDateLabel = finalUseArabic ? fixArabic("تاريخ الإصدار") : "Issue Date";
  const issueDateValue = dayjs(invoice.issueDate).format("YYYY-MM-DD");
  // Render label and value on the same line with proper spacing
  renderText(`${issueDateLabel}: ${issueDateValue}`, detailsX, yPos, { align: detailsAlign });
  
  if (invoice.dueDate) {
    yPos += 3.5; // Reduced from 5
    const dueDateLabel = finalUseArabic ? fixArabic("تاريخ الاستحقاق") : "Due Date";
    const dueDateValue = dayjs(invoice.dueDate).format("YYYY-MM-DD");
    // Render label and value on the same line with proper spacing
    renderText(`${dueDateLabel}: ${dueDateValue}`, detailsX, yPos, { align: detailsAlign });
  }
  
  if (invoice.paymentTerms) {
    yPos += 3.5; // Reduced from 5
    const paymentTermsLabel = finalUseArabic ? fixArabic("شروط الدفع") : "Payment Terms";
    // Format payment terms for Arabic: replace "days" with "يومًا"
    let paymentTermsText = invoice.paymentTerms;
    if (finalUseArabic) {
      // Replace "X days" or "X day" with "X يومًا"
      paymentTermsText = paymentTermsText.replace(/(\d+)\s*days?/gi, "$1 يومًا");
    }
    // Render label and value on the same line with proper spacing
    renderText(`${paymentTermsLabel}: ${paymentTermsText}`, detailsX, yPos, { align: detailsAlign });
  }

  // Items Table - Start closer to details
  const tableStartY = yPos + 8; // Reduced from 15
  
  // Ensure items is an array
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  
  // Calculate item values if missing
  const tableData = items.map((item) => {
    const quantity = parseFloat(item.quantity || 1);
    const unitPrice = parseFloat(item.unitPrice || 0);
    const discount = parseFloat(item.discount || 0);
    
    // Calculate line total if not provided
    const lineSubtotal = (quantity * unitPrice) - discount;
    const lineVatAmount = parseFloat(item.vatAmount || 0);
    const lineTotal = parseFloat(item.lineTotal || item.total || lineSubtotal + lineVatAmount);
    
    // Get description/name - ensure it's a string and handle Arabic text properly
    let description = String(item.description || item.name || "").trim();
    // Shape Arabic description
    if (finalUseArabic) {
      description = fixArabic(description);
    }
    
    // Calculate price after discount per unit
    const priceAfterDiscount = (quantity * unitPrice - discount) / (quantity || 1);
    
    // For RTL Arabic, reverse the column order (right to left)
    if (finalUseArabic) {
      return [
        lineTotal.toFixed(2),                    // المجموع (Total) - rightmost column
        lineVatAmount > 0 ? lineVatAmount.toFixed(2) : "0.00",  // ضريبة القيمة المضافة (VAT)
        discount > 0 ? discount.toFixed(2) : "0.00",            // الخصم (Discount)
        quantity,                                 // الكمية (Quantity)
        priceAfterDiscount.toFixed(2),            // السعر بعد الخصم (Price after discount)
        description                               // الوصف (Description) - leftmost column - already shaped
      ];
    } else {
      return [
        description,                              // Description
        unitPrice.toFixed(2),                     // Unit Price
        quantity,                                 // Qty
        discount > 0 ? discount.toFixed(2) : "0.00",  // Discount
        lineVatAmount > 0 ? lineVatAmount.toFixed(2) : "0.00",  // VAT
        lineTotal.toFixed(2)                      // Total
      ];
    }
  });

  // Use autoTable plugin - it extends jsPDF prototype
  // If no items, show a message
  if (tableData.length === 0) {
    doc.setFontSize(9);
    setFontSafe("normal");
    const noItemsText = finalUseArabic ? fixArabic("لا توجد عناصر") : "No items";
    renderText(noItemsText, pageWidth / 2, tableStartY, { align: "center" });
  } else {
    // Ensure font is set before creating table
    if (finalUseArabic) {
      try {
        doc.setFont(fontFamily, "normal");
        console.log("[PDF Service] Font confirmed before table");
      } catch (e) {
        console.warn("[PDF Service] Error setting font:", e.message);
      }
    }
    
    // For RTL Arabic, table headers must be in reverse order (right to left)
    // Order: Total (rightmost) -> VAT -> Discount -> Quantity -> Price -> Description (leftmost)
    // Shape all Arabic headers
    const tableHeaders = finalUseArabic 
      ? [
          fixArabic("المجموع"),                    // Total (rightmost)
          fixArabic("ضريبة القيمة المضافة"),      // VAT
          fixArabic("الخصم"),                      // Discount
          fixArabic("الكمية"),                     // Quantity
          fixArabic("السعر بعد الخصم"),           // Price after discount
          fixArabic("الوصف")                       // Description (leftmost)
        ]
      : [
          "Description",
          "Unit Price",
          "Qty",
          "Discount",
          "VAT",
          "Total"
        ];
    
    doc.autoTable({
      startY: tableStartY,
      head: [tableHeaders],
      body: tableData,
      theme: "striped",
      margin: { left: margin, right: rightMargin }, // Center the table with margins
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255, 
        fontStyle: finalUseArabic ? "normal" : "bold",
        font: fontFamily,
        fontSize: 7, // Reduced from 9
        halign: finalUseArabic ? "right" : "left"
      },
      styles: { 
        fontSize: 7, // Reduced from 9
        halign: finalUseArabic ? "right" : "left",
        font: fontFamily,
        fontStyle: "normal",
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 } // Reduced from 3
      },
      columnStyles: finalUseArabic ? {
        // RTL order: Total, VAT, Discount, Qty, Price, Description
        0: { 
          cellWidth: 30, 
          halign: "right",  // Total - rightmost
          font: fontFamily,
          fontStyle: "normal"
        },
        1: { 
          cellWidth: 30, 
          halign: "right",  // VAT
          font: fontFamily,
          fontStyle: "normal"
        },
        2: { 
          cellWidth: 25, 
          halign: "right",  // Discount
          font: fontFamily,
          fontStyle: "normal"
        },
        3: { 
          cellWidth: 20, 
          halign: "center",  // Quantity
          font: fontFamily,
          fontStyle: "normal"
        },
        4: { 
          cellWidth: 30, 
          halign: "right",  // Price after discount
          font: fontFamily,
          fontStyle: "normal"
        },
        5: { 
          cellWidth: 70, 
          halign: "left",  // Description - align left for better readability
          font: fontFamily,
          fontStyle: "normal",
          cellPadding: { top: 2, right: 5, bottom: 2, left: 2 } // Extra right padding for gap
        }
      } : {
        // LTR order: Description, Price, Qty, Discount, VAT, Total
        0: { 
          cellWidth: 70, 
          halign: "left",
          font: fontFamily,
          fontStyle: "normal",
          cellPadding: { top: 2, right: 5, bottom: 2, left: 2 } // Extra right padding for gap
        },
        1: { 
          cellWidth: 30, 
          halign: "right",
          font: fontFamily,
          fontStyle: "normal"
        },
        2: { 
          cellWidth: 20, 
          halign: "center",
          font: fontFamily,
          fontStyle: "normal"
        },
        3: { 
          cellWidth: 25, 
          halign: "right",
          font: fontFamily,
          fontStyle: "normal"
        },
        4: { 
          cellWidth: 25, 
          halign: "right",
          font: fontFamily,
          fontStyle: "normal"
        },
        5: { 
          cellWidth: 30, 
          halign: "right",
          font: fontFamily,
          fontStyle: "normal"
        }
      },
      // Add didParseCell hook to ensure font is applied to each cell
      didParseCell: function(data) {
        if (finalUseArabic) {
          // Ensure Arabic font is used for all cells
          data.cell.styles.font = fontFamily;
          data.cell.styles.fontStyle = "normal";
          
          // For RTL, adjust alignment for better readability
          // Column order (RTL): 0=Total, 1=VAT, 2=Discount, 3=Qty, 4=Price, 5=Description
          if (data.column.index === 5) {
            // Description column - align left for better readability
            data.cell.styles.halign = "left";
          } else if (data.column.index === 3) {
            // Quantity column - center
            data.cell.styles.halign = "center";
          } else {
            // All other columns (numbers) - right align
            data.cell.styles.halign = "right";
          }
          
          // Ensure all text cells use the Arabic font
          if (data.cell.text) {
            data.cell.styles.font = fontFamily;
            data.cell.styles.fontStyle = "normal";
            
            // Shape Arabic text in cells
            const cellText = data.cell.text.toString();
            const isNumeric = /^[\d.,\sAED]+$/.test(cellText);
            if (isNumeric) {
              // Add Left-to-Right Mark to force LTR for numbers
              data.cell.text = '\u200E' + cellText + '\u200E';
            } else {
              // Shape Arabic text in non-numeric cells
              data.cell.text = fixArabic(cellText);
            }
          }
        }
      },
      // Add willDrawCell hook to ensure font is set when drawing
      willDrawCell: function(data) {
        if (finalUseArabic) {
          // Ensure font is set when drawing cells
          try {
            doc.setFont(fontFamily, "normal");
          } catch (e) {
            // Ignore
          }
        }
      }
    });
    
    // Re-apply font after table is drawn
    if (finalUseArabic) {
      doc.setFont(fontFamily, "normal");
    }
  }

  // Summary Section - Fixed alignment for Arabic RTL
  // Get final Y position from doc.lastAutoTable
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : (tableData.length > 0 ? tableStartY + (tableData.length * 6) + 15 : tableStartY + 10);
  let summaryY = finalY;
  
  // For Arabic RTL: labels on right side (near right margin), amounts on left side (near left margin)
  // For English LTR: labels on left side with proper margin, amounts on right side
  const summaryX = finalUseArabic ? pageWidth - rightMargin - 50 : margin + 20; // More margin for English
  const summaryAlign = finalUseArabic ? "right" : "left";  // Right-align for Arabic, left-align for English
  const amountX = finalUseArabic ? margin + 50 : pageWidth - rightMargin;
  const amountAlign = "right";  // Always right-align amounts (numbers read left-to-right)

  doc.setFontSize(7); // Reduced from 9
  setFontSafe("normal");
  const subtotalLabel = finalUseArabic ? fixArabic("المجموع الفرعي") : "Subtotal";
  const subtotal = parseFloat(invoice.subtotal || invoice.totalSales || 0);
  renderText(`${subtotalLabel}:`, summaryX, summaryY, { align: summaryAlign });
  renderNumber(`AED ${subtotal.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  
  const totalDiscount = parseFloat(invoice.totalDiscount || invoice.discountTotal || 0);
  if (totalDiscount > 0) {
    summaryY += 3.5; // Reduced from 5
    const discountLabel = finalUseArabic ? fixArabic("الخصم") : "Discount";
    renderText(`${discountLabel}:`, summaryX, summaryY, { align: summaryAlign });
    renderNumber(`AED ${totalDiscount.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  }
  
  summaryY += 3.5; // Reduced from 5
  const vatLabel = finalUseArabic ? fixArabic("ضريبة القيمة المضافة (٪5)") : "VAT (5%)";
  renderText(`${vatLabel}:`, summaryX, summaryY, { align: summaryAlign });
  const vatAmount = parseFloat(invoice.vatAmount || invoice.totalVAT || 0);
  renderNumber(`AED ${vatAmount.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  
  summaryY += 4; // Reduced from 6
  doc.setFontSize(9); // Reduced from 11
  setFontSafe("bold");
  const totalLabel = finalUseArabic ? fixArabic("الإجمالي") : "Grand Total";
  renderText(`${totalLabel}:`, summaryX, summaryY, { align: summaryAlign });
  const grandTotal = parseFloat(invoice.total || invoice.totalWithVAT || invoice.grandTotal || 0);
  renderNumber(`AED ${grandTotal.toFixed(2)}`, amountX, summaryY, { align: amountAlign });

  // Notes Section - Compact layout
  if (invoice.notes) {
    summaryY += 6; // Reduced from 10
    const notesX = finalUseArabic ? pageWidth - rightMargin : margin;
    const notesAlign = finalUseArabic ? "right" : "left";
    doc.setFontSize(7); // Reduced from 9
    setFontSafe("bold");
    const notesLabel = finalUseArabic ? fixArabic("ملاحظات") : "Notes";
    renderText(`${notesLabel}:`, notesX, summaryY, { align: notesAlign });
    
    summaryY += 4; // Reduced from 6
    setFontSafe("normal");
    const notesText = finalUseArabic ? fixArabic(invoice.notes) : invoice.notes;
    const notesLines = doc.splitTextToSize(notesText, pageWidth - margin - rightMargin);
    notesLines.forEach((line, index) => {
      if (finalUseArabic) {
        doc.setFont(fontFamily, "normal");
      }
      doc.text(line, notesX, summaryY + (index * 4), { align: notesAlign }); // Reduced from 5
    });
  }

  // Footer - Compact
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7); // Reduced from 8
  setFontSafe("italic");
  const thankYouText = finalUseArabic ? fixArabic("شكراً لعملك معنا") : "Thank you for your business!";
  renderText(thankYouText, pageWidth / 2, pageHeight - 8, { align: "center" }); // Reduced from 10

  return doc.output("arraybuffer");
}

/**
 * Generate receipt PDF for POS sales (similar to invoice but simplified)
 * @param {Object} sale - Sale record with items and totals
 * @param {string} language - Language code ('en' or 'ar')
 * @param {Object} companyInfo - Company information from database (optional)
 * @returns {ArrayBuffer} PDF buffer
 */
async function generateReceiptPdf(sale, language = 'en', companyInfo = null) {
  const isArabic = language === "ar";
  
  // Create PDF document
  const doc = new jsPDF({ 
    orientation: "portrait", 
    unit: "mm",
    compress: true
  });
  
  // Manually add autoTable method if plugin didn't extend prototype
  if (typeof doc.autoTable !== 'function') {
    if (typeof autoTable === 'function') {
      doc.autoTable = function(options) {
        return autoTable(doc, options);
      };
    } else {
      throw new Error("jspdf-autotable plugin not loaded correctly. autoTable is not a function.");
    }
  }
  
  // Try to load Arabic font if needed
  let hasArabicFont = false;
  if (isArabic) {
    hasArabicFont = await loadArabicFont(doc);
    if (!hasArabicFont) {
      console.warn("[Receipt PDF] Arabic font not found, falling back to English");
    }
  }
  
  // Use Arabic font if available, otherwise fallback to helvetica
  let fontFamily = "helvetica";
  let actualUseArabic = false;
  
  if (isArabic && hasArabicFont) {
    const fontCandidates = [
      doc._arabicFontName,
      "NotoSansArabic-Regular",
      "NotoSansArabic",
      "NotoSans"
    ].filter(Boolean);
    
    for (const candidate of fontCandidates) {
      try {
        doc.setFont(candidate, "normal");
        fontFamily = candidate;
        actualUseArabic = true;
        console.log(`[Receipt PDF] Using Arabic font: ${candidate}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!actualUseArabic) {
      console.warn("[Receipt PDF] Arabic font not available, falling back to helvetica");
      fontFamily = "helvetica";
    }
  }
  
  const finalUseArabic = actualUseArabic;
  
  // Helper function to set font
  const setFontSafe = (style = "normal") => {
    try {
      if (finalUseArabic) {
        doc.setFont(fontFamily, "normal");
      } else {
        doc.setFont(fontFamily, style);
      }
    } catch (fontError) {
      console.warn(`[Receipt PDF] Error setting font ${fontFamily}, falling back to helvetica: ${fontError.message}`);
      doc.setFont("helvetica", style);
    }
  };
  
  // Helper to render text with proper font setting for Arabic
  const renderText = (text, x, y, options = {}) => {
    setFontSafe(options.fontStyle || "normal");
    if (finalUseArabic && containsArabic(text)) {
      text = fixArabic(text);
    }
    doc.text(text, x, y, options);
  };
  
  // Helper to render numbers (always LTR)
  const renderNumber = (text, x, y, options = {}) => {
    setFontSafe("normal");
    // Add Left-to-Right Mark for numbers
    doc.text('\u200E' + text + '\u200E', x, y, options);
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // Use equal margins for better centering
  const margin = 20;
  const rightMargin = 20;
  
  // Get company name - for receipts, prioritize shopName if available, otherwise use name
  // Use database company info if available, otherwise fallback to config
  const companyName = companyInfo?.shopName || companyInfo?.name || companyConfig.companyName;
  const companyAddress = companyInfo?.address || companyConfig.address;
  const companyPhone = companyInfo?.phone || companyConfig.phone;
  const companyEmail = companyInfo?.email || companyConfig.email;
  const companyTrn = companyInfo?.trn || companyConfig.trn;
  
  console.log("[Receipt PDF] Using company name:", companyName, "from:", companyInfo ? "database" : "config");
  
  // Header - Blue background
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  setFontSafe("bold");
  const companyX = finalUseArabic ? pageWidth - margin : margin;
  const companyAlign = finalUseArabic ? "right" : "left";
  renderText(companyName, companyX, 20, { align: companyAlign });
  
  // Receipt label
  doc.setFontSize(16);
  const receiptX = finalUseArabic ? margin : pageWidth - margin;
  const receiptLabel = finalUseArabic ? fixArabic("إيصال") : "RECEIPT";
  renderText(receiptLabel, receiptX, 20, { align: finalUseArabic ? "left" : "right" });
  
  // Receipt number
  if (sale.id) {
    doc.setFontSize(12);
    const receiptNumber = finalUseArabic 
      ? fixArabic(`رقم الإيصال: SALE-${sale.id}`)
      : `Receipt #: SALE-${sale.id}`;
    renderText(receiptNumber, receiptX, 30, { align: finalUseArabic ? "left" : "right" });
  }
  
  doc.setTextColor(0, 0, 0);
  
  // Company info section - centered
  let yPos = 50;
  const infoX = pageWidth / 2;
  const infoAlign = "center";
  
  doc.setFontSize(11);
  setFontSafe("bold");
  renderText(companyName, infoX, yPos, { align: infoAlign });
  
  yPos += 6; // Increased space after company name for better clarity
  doc.setFontSize(9); // Keep at 9 for receipts (already good size)
  setFontSafe("normal");
  doc.setTextColor(0, 0, 0); // Ensure text color is black
  
  // Handle multi-line address properly
  if (companyAddress) {
    const addressLines = companyAddress.split('\n').filter(line => line.trim());
    addressLines.forEach((line, index) => {
      if (line.trim()) {
        renderText(line.trim(), infoX, yPos, { align: infoAlign });
        yPos += 4; // Increased spacing between address lines
      }
    });
    yPos += 2; // Extra space after address block
  }
  
  if (companyPhone) {
    yPos += 1; // Space before Phone
    const phoneLabel = finalUseArabic ? fixArabic("هاتف") : "Phone";
    renderText(`${phoneLabel}: ${companyPhone}`, infoX, yPos, { align: infoAlign });
    yPos += 5; // Keep spacing after Phone
  }
  
  if (companyEmail) {
    const emailLabel = finalUseArabic ? fixArabic("بريد إلكتروني") : "Email";
    renderText(`${emailLabel}: ${companyEmail}`, infoX, yPos, { align: infoAlign });
    yPos += 5; // Keep spacing after Email
  }
  
  if (companyTrn) {
    const trnLabel = finalUseArabic ? fixArabic("رقم التسجيل الضريبي") : "TRN";
    renderText(`${trnLabel}: ${companyTrn}`, infoX, yPos, { align: infoAlign });
    yPos += 5; // Keep spacing after TRN
  }
  
  // Date and time - centered
  yPos += 4;
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const dateLabel = finalUseArabic ? fixArabic("تاريخ الإصدار") : "Issue Date";
  const dateValue = dayjs(saleDate).format("YYYY-MM-DD");
  const timeValue = saleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  renderText(`${dateLabel}: ${dateValue} ${timeValue}`, infoX, yPos, { align: infoAlign });
  yPos += 8;
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // Items table
  const items = Array.isArray(sale.items) ? sale.items : [];
  
  const tableData = items.map((item) => {
    const quantity = parseFloat(item.quantity || 1);
    const unitPrice = parseFloat(item.unitPrice || item.item?.salePrice || 0);
    const lineTotal = parseFloat(item.total || item.lineTotal || (quantity * unitPrice));
    
    let description = String(item.name || item.description || item.item?.name || "").trim();
    if (finalUseArabic) {
      description = fixArabic(description);
    }
    
    if (finalUseArabic) {
      return [
        lineTotal.toFixed(2),  // Total (rightmost)
        quantity,              // Quantity
        unitPrice.toFixed(2),  // Unit Price
        description            // Description (leftmost)
      ];
    } else {
      return [
        description,           // Description
        quantity,              // Quantity
        unitPrice.toFixed(2),  // Unit Price
        lineTotal.toFixed(2)   // Total
      ];
    }
  });
  
  if (tableData.length === 0) {
    doc.setFontSize(9);
    setFontSafe("normal");
    const noItemsText = finalUseArabic ? fixArabic("لا توجد عناصر") : "No items";
    renderText(noItemsText, pageWidth / 2, yPos, { align: "center" });
  } else {
    if (finalUseArabic) {
      try {
        doc.setFont(fontFamily, "normal");
      } catch (e) {
        console.warn("[Receipt PDF] Error setting font:", e.message);
      }
    }
    
    const tableHeaders = finalUseArabic 
      ? [
          fixArabic("المجموع"),      // Total
          fixArabic("الكمية"),       // Quantity
          fixArabic("السعر"),        // Unit Price
          fixArabic("الوصف")          // Description
        ]
      : [
          "Description",
          "Qty",
          "Unit Price",
          "Total"
        ];
    
    doc.autoTable({
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      theme: "striped",
      margin: { left: margin, right: rightMargin },
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255, 
        fontStyle: finalUseArabic ? "normal" : "bold",
        font: fontFamily,
        fontSize: 10,
        halign: finalUseArabic ? "right" : "left",
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 }
      },
      styles: { 
        fontSize: 10,
        halign: finalUseArabic ? "right" : "left",
        font: fontFamily,
        fontStyle: "normal",
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      columnStyles: finalUseArabic ? {
        0: { cellWidth: 35, halign: "right", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        1: { cellWidth: 25, halign: "center", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        2: { cellWidth: 35, halign: "right", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        3: { cellWidth: 80, halign: "left", font: fontFamily, fontStyle: "normal", fontSize: 10 }
      } : {
        0: { cellWidth: 80, halign: "left", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        1: { cellWidth: 25, halign: "center", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        2: { cellWidth: 35, halign: "right", font: fontFamily, fontStyle: "normal", fontSize: 10 },
        3: { cellWidth: 35, halign: "right", font: fontFamily, fontStyle: "normal", fontSize: 10 }
      },
      didParseCell: function(data) {
        if (finalUseArabic) {
          data.cell.styles.font = fontFamily;
          data.cell.styles.fontStyle = "normal";
          if (data.cell.text) {
            const cellText = data.cell.text.toString();
            const isNumeric = /^[\d.,\sAED]+$/.test(cellText);
            if (isNumeric) {
              data.cell.text = '\u200E' + cellText + '\u200E';
            } else {
              data.cell.text = fixArabic(cellText);
            }
          }
        }
      },
      willDrawCell: function(data) {
        if (finalUseArabic) {
          try {
            doc.setFont(fontFamily, "normal");
          } catch (e) {
            // Ignore
          }
        }
      }
    });
    
    if (finalUseArabic) {
      doc.setFont(fontFamily, "normal");
    }
  }
  
  // Summary Section - centered layout
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : (tableData.length > 0 ? yPos + (tableData.length * 6) + 15 : yPos + 10);
  let summaryY = finalY;
  
  // Center the summary section
  const summaryX = pageWidth / 2 - 40;
  const summaryAlign = "right";
  const amountX = pageWidth / 2 + 40;
  const amountAlign = "left";
  
  doc.setFontSize(10);
  setFontSafe("normal");
  
  const subtotal = parseFloat(sale.totalSales || sale.subtotal || 0);
  const subtotalLabel = finalUseArabic ? fixArabic("المجموع الفرعي") : "Subtotal";
  renderText(`${subtotalLabel}:`, summaryX, summaryY, { align: summaryAlign });
  renderNumber(`AED ${subtotal.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  
  const vatAmount = parseFloat(sale.totalVAT || sale.vatAmount || 0);
  if (vatAmount > 0) {
    summaryY += 5;
    const vatLabel = finalUseArabic ? fixArabic("ضريبة القيمة المضافة (٪5)") : "VAT (5%)";
    renderText(`${vatLabel}:`, summaryX, summaryY, { align: summaryAlign });
    renderNumber(`AED ${vatAmount.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  }
  
  summaryY += 7;
  doc.setFontSize(12);
  setFontSafe("bold");
  const totalLabel = finalUseArabic ? fixArabic("الإجمالي") : "Total";
  const grandTotal = parseFloat(sale.grandTotal || sale.total || (subtotal + vatAmount));
  renderText(`${totalLabel}:`, summaryX, summaryY, { align: summaryAlign });
  renderNumber(`AED ${grandTotal.toFixed(2)}`, amountX, summaryY, { align: amountAlign });
  
  // Notes
  if (sale.notes) {
    summaryY += 8;
    const notesX = finalUseArabic ? pageWidth - rightMargin : margin;
    const notesAlign = finalUseArabic ? "right" : "left";
    doc.setFontSize(9);
    setFontSafe("bold");
    const notesLabel = finalUseArabic ? fixArabic("ملاحظات") : "Notes";
    renderText(`${notesLabel}:`, notesX, summaryY, { align: notesAlign });
    
    summaryY += 5;
    setFontSafe("normal");
    const notesText = finalUseArabic ? fixArabic(sale.notes) : sale.notes;
    const notesLines = doc.splitTextToSize(notesText, pageWidth - margin - rightMargin);
    notesLines.forEach((line, index) => {
      if (finalUseArabic) {
        doc.setFont(fontFamily, "normal");
      }
      doc.text(line, notesX, summaryY + (index * 5), { align: notesAlign });
    });
  }
  
  // Footer
  doc.setFontSize(8);
  setFontSafe("italic");
  const thankYouText = finalUseArabic ? fixArabic("شكراً لتعاملك معنا!") : "Thank you for your business!";
  renderText(thankYouText, pageWidth / 2, pageHeight - 10, { align: "center" });
  
  return doc.output("arraybuffer");
}

/**
 * Generate UAE-compliant payslip PDF
 * @param {Object} payrollRecord - Payroll record with employee and period data
 * @returns {Buffer} PDF buffer
 */
async function generatePayslipPdf(payrollRecord) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  
  // Manually add autoTable method if plugin didn't extend prototype
  if (typeof doc.autoTable !== 'function') {
    if (typeof autoTable === 'function') {
      doc.autoTable = function(options) {
        return autoTable(doc, options);
      };
    } else {
      throw new Error("jspdf-autotable plugin not loaded correctly. autoTable is not a function.");
    }
  }

  const employee = payrollRecord.employee || {};
  const period = payrollRecord.period || {};
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(41, 128, 185); // Blue header
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PAYSLIP", pageWidth / 2, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companyConfig.companyName || "Company Name", pageWidth / 2, 22, { align: "center" });

  let yPos = 40;

  // Employee Information
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Information", 10, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${employee.fullName || 'N/A'}`, 10, yPos);
  yPos += 6;
  doc.text(`Employee ID: ${employee.id || 'N/A'}`, 10, yPos);
  yPos += 6;
  doc.text(`Designation: ${employee.designation || 'N/A'}`, 10, yPos);
  yPos += 6;
  doc.text(`Email: ${employee.email || 'N/A'}`, 10, yPos);

  // Period Information (right side)
  let yPosRight = 40;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Pay Period", pageWidth - 10, yPosRight, { align: "right" });
  
  yPosRight += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const periodName = period.periodName || 'N/A';
  doc.text(`Period: ${periodName}`, pageWidth - 10, yPosRight, { align: "right" });
  yPosRight += 6;
  
  if (period.startDate && period.endDate) {
    const startDate = dayjs(period.startDate).format("DD MMM YYYY");
    const endDate = dayjs(period.endDate).format("DD MMM YYYY");
    doc.text(`${startDate} - ${endDate}`, pageWidth - 10, yPosRight, { align: "right" });
    yPosRight += 6;
  }
  
  if (period.payDate) {
    const payDate = dayjs(period.payDate).format("DD MMM YYYY");
    doc.text(`Pay Date: ${payDate}`, pageWidth - 10, yPosRight, { align: "right" });
  }

  yPos = Math.max(yPos, yPosRight) + 10;

  // Earnings Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Earnings", 10, yPos);
  yPos += 5;

  const earningsData = [
    ["Description", "Amount (AED)"],
    ["Basic Salary", parseFloat(payrollRecord.basicSalary || 0).toFixed(2)],
    ["Housing Allowance", parseFloat(payrollRecord.housingAllowance || 0).toFixed(2)],
    ["Transport Allowance", parseFloat(payrollRecord.transportAllowance || 0).toFixed(2)],
    ["Other Allowances", parseFloat(payrollRecord.otherAllowances || 0).toFixed(2)],
  ];

  if (parseFloat(payrollRecord.overtimeAmount || 0) > 0) {
    earningsData.push([
      `Overtime (${parseFloat(payrollRecord.overtimeHours || 0).toFixed(2)} hrs)`,
      parseFloat(payrollRecord.overtimeAmount || 0).toFixed(2)
    ]);
  }

  earningsData.push([
    "Total Gross Salary",
    parseFloat(payrollRecord.grossSalary || 0).toFixed(2)
  ]);

  doc.autoTable({
    startY: yPos,
    head: [earningsData[0]],
    body: earningsData.slice(1),
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: "right" }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Deductions Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Deductions", 10, yPos);
  yPos += 5;

  const deductionsData = [
    ["Description", "Amount (AED)"],
  ];

  if (parseFloat(payrollRecord.incomeTax || 0) > 0) {
    deductionsData.push(["Income Tax", parseFloat(payrollRecord.incomeTax || 0).toFixed(2)]);
  }
  if (parseFloat(payrollRecord.socialSecurity || 0) > 0) {
    deductionsData.push(["Social Security", parseFloat(payrollRecord.socialSecurity || 0).toFixed(2)]);
  }
  if (parseFloat(payrollRecord.otherDeductions || 0) > 0) {
    deductionsData.push(["Other Deductions", parseFloat(payrollRecord.otherDeductions || 0).toFixed(2)]);
  }
  if (parseFloat(payrollRecord.annualLeaveAmount || 0) > 0) {
    deductionsData.push([
      `Annual Leave (${parseFloat(payrollRecord.annualLeaveDays || 0).toFixed(2)} days)`,
      parseFloat(payrollRecord.annualLeaveAmount || 0).toFixed(2)
    ]);
  }

  if (deductionsData.length === 1) {
    deductionsData.push(["No Deductions", "0.00"]);
  }

  deductionsData.push([
    "Total Deductions",
    parseFloat(payrollRecord.totalDeductions || 0).toFixed(2)
  ]);

  doc.autoTable({
    startY: yPos,
    head: [deductionsData[0]],
    body: deductionsData.slice(1),
    theme: "striped",
    headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: "right" }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Net Pay
  doc.setFillColor(46, 204, 113); // Green
  doc.rect(10, yPos, pageWidth - 20, 15, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Net Payable", 15, yPos + 10);
  
  const netPay = parseFloat(payrollRecord.totalPayable || payrollRecord.netSalary || 0).toFixed(2);
  doc.text(`AED ${netPay}`, pageWidth - 15, yPos + 10, { align: "right" });

  yPos += 25;

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This is a computer-generated payslip. No signature required.",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  doc.text(
    `Generated on: ${dayjs().format("DD MMM YYYY HH:mm")}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  return doc.output("arraybuffer");
}

module.exports = { generateInvoicePdf, generateReceiptPdf, generatePayslipPdf };

