const dayjs = require("dayjs");
const { sequelize } = require("../config/database");
const Employee = require("../../models/Employee");
const { sendEmail } = require("./emailService");

/**
 * Check for expiring documents and send reminder emails to admin
 */
async function checkExpiringDocuments() {
  try {
    console.log("[HR Reminder] Checking for expiring documents...");
    
    const today = dayjs();
    const thirtyDaysFromNow = today.add(30, "day");

    // Find employees with documents expiring within 30 days
    const employees = await Employee.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          {
            passportExpiry: {
              [sequelize.Sequelize.Op.between]: [today.toDate(), thirtyDaysFromNow.toDate()]
            }
          },
          {
            visaExpiry: {
              [sequelize.Sequelize.Op.between]: [today.toDate(), thirtyDaysFromNow.toDate()]
            }
          },
          {
            insuranceExpiry: {
              [sequelize.Sequelize.Op.between]: [today.toDate(), thirtyDaysFromNow.toDate()]
            }
          }
        ]
      },
      raw: true
    });

    if (employees.length === 0) {
      console.log("[HR Reminder] No expiring documents found.");
      return;
    }

    console.log(`[HR Reminder] Found ${employees.length} employee(s) with expiring documents.`);

    // Group expiring documents by type
    const expiringDocs = {
      passport: [],
      visa: [],
      insurance: []
    };

    employees.forEach((emp) => {
      if (emp.passportExpiry) {
        const daysUntilExpiry = dayjs(emp.passportExpiry).diff(today, "day");
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          expiringDocs.passport.push({
            employee: emp.fullName || emp.name,
            expiryDate: dayjs(emp.passportExpiry).format("DD MMM YYYY"),
            daysRemaining: daysUntilExpiry
          });
        }
      }

      if (emp.visaExpiry) {
        const daysUntilExpiry = dayjs(emp.visaExpiry).diff(today, "day");
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          expiringDocs.visa.push({
            employee: emp.fullName || emp.name,
            expiryDate: dayjs(emp.visaExpiry).format("DD MMM YYYY"),
            daysRemaining: daysUntilExpiry
          });
        }
      }

      if (emp.insuranceExpiry) {
        const daysUntilExpiry = dayjs(emp.insuranceExpiry).diff(today, "day");
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          expiringDocs.insurance.push({
            employee: emp.fullName || emp.name,
            expiryDate: dayjs(emp.insuranceExpiry).format("DD MMM YYYY"),
            daysRemaining: daysUntilExpiry
          });
        }
      }
    });

    // Build email content
    let emailBody = "<h2>HR Document Expiry Reminder</h2>";
    emailBody += "<p>The following documents are expiring within 30 days:</p>";

    if (expiringDocs.passport.length > 0) {
      emailBody += "<h3>Passports Expiring:</h3><ul>";
      expiringDocs.passport.forEach((doc) => {
        emailBody += `<li><strong>${doc.employee}</strong> - Expires: ${doc.expiryDate} (${doc.daysRemaining} days remaining)</li>`;
      });
      emailBody += "</ul>";
    }

    if (expiringDocs.visa.length > 0) {
      emailBody += "<h3>Visas Expiring:</h3><ul>";
      expiringDocs.visa.forEach((doc) => {
        emailBody += `<li><strong>${doc.employee}</strong> - Expires: ${doc.expiryDate} (${doc.daysRemaining} days remaining)</li>`;
      });
      emailBody += "</ul>";
    }

    if (expiringDocs.insurance.length > 0) {
      emailBody += "<h3>Insurance Expiring:</h3><ul>";
      expiringDocs.insurance.forEach((doc) => {
        emailBody += `<li><strong>${doc.employee}</strong> - Expires: ${doc.expiryDate} (${doc.daysRemaining} days remaining)</li>`;
      });
      emailBody += "</ul>";
    }

    emailBody += "<p>Please take necessary action to renew these documents.</p>";

    // Get admin email from environment or use default
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || "admin@biz.com";

    // Send email to admin
    try {
      await sendEmail({
        to: adminEmail,
        subject: "HR Document Expiry Reminder - Action Required",
        html: emailBody
      });
      console.log(`[HR Reminder] Reminder email sent to ${adminEmail}`);
    } catch (emailError) {
      console.error("[HR Reminder] Failed to send reminder email:", emailError.message);
    }
  } catch (error) {
    console.error("[HR Reminder] Error checking expiring documents:", error.message);
  }
}

module.exports = {
  checkExpiringDocuments
};

