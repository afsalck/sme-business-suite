const { jsPDF } = require("jspdf");
const dayjs = require("dayjs");
const path = require("path");
const fs = require("fs");
const companyConfig = require("../config/company");

/**
 * Generate a contract PDF for an employee
 * @param {Object} contractData - Contract data including employee info
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateContractPdf(contractData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  
  // Set up fonts and styling
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const { fontSize = 10, fontStyle = "normal", align = "left", maxWidth = contentWidth } = options;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y, { align });
    return lines.length * (fontSize * 0.4); // Return height used
  };

  // Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  addText(companyConfig.companyName || "BizEase UAE", margin, 20, { fontSize: 20, fontStyle: "bold" });
  addText("Employment Contract", margin, 30, { fontSize: 14 });
  
  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Contract Number
  addText(`Contract Number: ${contractData.contractNumber}`, margin, yPosition, { fontSize: 12, fontStyle: "bold" });
  yPosition += 10;

  // Date
  addText(`Date: ${dayjs().format("DD MMMM YYYY")}`, margin, yPosition, { fontSize: 10 });
  yPosition += 15;

  // Parties
  addText("PARTIES", margin, yPosition, { fontSize: 12, fontStyle: "bold" });
  yPosition += 8;
  
  addText(`This Employment Contract ("Contract") is entered into on ${dayjs(contractData.startDate).format("DD MMMM YYYY")} between:`, margin, yPosition, { fontSize: 10 });
  yPosition += 8;
  
  addText(`1. ${companyConfig.companyName || "Company Name"}`, margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 6;
  addText(`   Address: ${companyConfig.address || "Company Address"}`, margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  addText(`   ("Employer")`, margin, yPosition, { fontSize: 10 });
  yPosition += 10;
  
  addText(`2. ${contractData.employeeFullName}`, margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 6;
  if (contractData.employeePassport) {
    addText(`   Passport No: ${contractData.employeePassport}`, margin, yPosition, { fontSize: 10 });
    yPosition += 6;
  }
  if (contractData.employeeEmiratesId) {
    addText(`   Emirates ID: ${contractData.employeeEmiratesId}`, margin, yPosition, { fontSize: 10 });
    yPosition += 6;
  }
  addText(`   ("Employee")`, margin, yPosition, { fontSize: 10 });
  yPosition += 15;

  // Terms
  addText("TERMS AND CONDITIONS", margin, yPosition, { fontSize: 12, fontStyle: "bold" });
  yPosition += 8;

  // Position
  addText(`1. Position: The Employee shall serve as ${contractData.designation}.`, margin, yPosition, { fontSize: 10 });
  yPosition += 8;

  // Contract Type
  addText(`2. Contract Type: This is a ${contractData.contractType} employment contract.`, margin, yPosition, { fontSize: 10 });
  yPosition += 8;

  // Start Date
  addText(`3. Commencement Date: The employment shall commence on ${dayjs(contractData.startDate).format("DD MMMM YYYY")}.`, margin, yPosition, { fontSize: 10 });
  yPosition += 8;

  // End Date (if applicable)
  if (contractData.endDate) {
    addText(`4. End Date: The employment shall end on ${dayjs(contractData.endDate).format("DD MMMM YYYY")}.`, margin, yPosition, { fontSize: 10 });
    yPosition += 8;
  }

  // Salary
  const totalSalary = parseFloat(contractData.basicSalary || 0) + parseFloat(contractData.allowance || 0);
  addText(`5. Remuneration:`, margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 6;
  addText(`   - Basic Salary: AED ${parseFloat(contractData.basicSalary || 0).toFixed(2)}`, margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  if (contractData.allowance && parseFloat(contractData.allowance) > 0) {
    addText(`   - Allowance: AED ${parseFloat(contractData.allowance).toFixed(2)}`, margin, yPosition, { fontSize: 10 });
    yPosition += 6;
  }
  addText(`   - Total Monthly Salary: AED ${totalSalary.toFixed(2)}`, margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 10;

  // Additional Terms
  if (contractData.terms) {
    addText(`6. Additional Terms:`, margin, yPosition, { fontSize: 10, fontStyle: "bold" });
    yPosition += 6;
    const termsHeight = addText(contractData.terms, margin, yPosition, { fontSize: 10 });
    yPosition += termsHeight + 8;
  }

  // Signatures section
  if (yPosition > 250) {
    doc.addPage();
    yPosition = margin;
  }

  yPosition += 10;
  addText("SIGNATURES", margin, yPosition, { fontSize: 12, fontStyle: "bold" });
  yPosition += 15;

  // Employer signature
  addText("Employer:", margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 15;
  addText("_________________________", margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  addText("Authorized Signatory", margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  addText(companyConfig.companyName || "Company Name", margin, yPosition, { fontSize: 10 });
  yPosition += 15;

  // Employee signature
  addText("Employee:", margin, yPosition, { fontSize: 10, fontStyle: "bold" });
  yPosition += 15;
  addText("_________________________", margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  addText(contractData.employeeFullName, margin, yPosition, { fontSize: 10 });
  yPosition += 6;
  addText(`Date: ${dayjs().format("DD MMMM YYYY")}`, margin, yPosition, { fontSize: 10 });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}

module.exports = {
  generateContractPdf
};

