const cron = require("node-cron");
const dayjs = require("dayjs");
const { sendEmail } = require("./emailService");
const Employee = require("../../models/Employee");
const Invoice = require("../../models/Invoice");

function parseRecipientList() {
  const recipients = process.env.ALERT_RECIPIENTS || "";
  return recipients
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function sendDocumentExpiryAlerts() {
  const recipients = parseRecipientList();
  if (recipients.length === 0) {
    return;
  }

  const today = dayjs();
  const threshold = today.add(30, "day").endOf("day").toDate();

  const expiringEmployees = await Employee.find({
    $or: [{ visaExpiry: { $lte: threshold } }, { passportExpiry: { $lte: threshold } }]
  }).lean();

  if (expiringEmployees.length === 0) {
    return;
  }

  const rows = expiringEmployees
    .map((employee) => {
      const visaExpiry = employee.visaExpiry
        ? dayjs(employee.visaExpiry).format("YYYY-MM-DD")
        : "N/A";
      const passportExpiry = employee.passportExpiry
        ? dayjs(employee.passportExpiry).format("YYYY-MM-DD")
        : "N/A";
      return `<tr>
        <td>${employee.name}</td>
        <td>${employee.position || ""}</td>
        <td>${visaExpiry}</td>
        <td>${passportExpiry}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <h2>BizEase UAE — Document Expiry Alert</h2>
    <p>The following employees have visa or passport documents expiring within 30 days:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Name</th>
          <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Position</th>
          <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Visa Expiry</th>
          <th style="text-align:left; border-bottom:1px solid #ccc; padding:8px;">Passport Expiry</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  await sendEmail({
    to: recipients,
    subject: "BizEase UAE — Document Expiry Alert",
    html,
    text:
      "The attached table lists employees with documents expiring within 30 days. Please log in to BizEase UAE for details."
  });
}

async function sendMonthlyVatSummary() {
  const recipients = parseRecipientList();
  if (recipients.length === 0) {
    return;
  }

  const startOfMonth = dayjs().startOf("month").toDate();
  const endOfMonth = dayjs().endOf("month").toDate();

  const invoices = await Invoice.find({
    issueDate: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean();

  const vatPayable = invoices.reduce((sum, invoice) => sum + (invoice.vatAmount || 0), 0);
  const totalSales = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);

  const html = `
    <h2>BizEase UAE — Monthly VAT Summary</h2>
    <p>Totals for ${dayjs().format("MMMM YYYY")}:</p>
    <ul>
      <li>Total Invoiced Sales: AED ${totalSales.toFixed(2)}</li>
      <li>VAT Payable (5%): AED ${vatPayable.toFixed(2)}</li>
    </ul>
    <p>Please review your records and submit VAT filings if required.</p>
  `;

  await sendEmail({
    to: recipients,
    subject: `BizEase UAE — VAT Summary for ${dayjs().format("MMMM YYYY")}`,
    html,
    text: `VAT Payable for ${dayjs().format("MMMM YYYY")}: AED ${vatPayable.toFixed(
      2
    )}. Total sales: AED ${totalSales.toFixed(2)}.`
  });
}

function scheduleAlerts() {
  try {
    cron.schedule("0 6 * * *", async () => {
      try {
        await sendDocumentExpiryAlerts();
      } catch (error) {
        console.error("Failed to send document expiry alerts:", error);
      }
    });

    cron.schedule("0 7 1 * *", async () => {
      try {
        await sendMonthlyVatSummary();
      } catch (error) {
        console.error("Failed to send monthly VAT summary:", error);
      }
    });
    console.log("✓ Cron jobs scheduled successfully");
  } catch (error) {
    console.error("⚠️  Failed to schedule cron jobs:", error.message);
    throw error; // Re-throw so caller can handle it
  }
}

module.exports = {
  scheduleAlerts,
  sendDocumentExpiryAlerts,
  sendMonthlyVatSummary
};

