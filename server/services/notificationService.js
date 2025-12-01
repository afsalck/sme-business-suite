const Notification = require('../../models/Notification');
const { sequelize } = require('../config/database');
const dayjs = require('dayjs');

// Try to load timezone plugin if available
try {
  const timezone = require('dayjs/plugin/timezone');
  const utc = require('dayjs/plugin/utc');
  dayjs.extend(utc);
  dayjs.extend(timezone);
} catch (e) {
  console.warn('[Notification Service] Timezone plugin not available, using local time');
}

/**
 * Generate a unique notification key to prevent duplicates
 */
function generateNotificationKey(type, userId, entityId, dueDate) {
  const dateStr = dueDate ? dayjs(dueDate).format('YYYY-MM-DD') : 'no-date';
  return `${type}_${userId}_${entityId}_${dateStr}`;
}

/**
 * Create a notification if it doesn't already exist
 */
async function createNotificationIfNotExists({
  userId,
  type,
  title,
  message,
  dueDate,
  link,
  entityId
}) {
  try {
    const notificationKey = generateNotificationKey(type, userId, entityId || 'global', dueDate);
    
    // Check if notification already exists
    const existing = await Notification.findOne({
      where: { notificationKey }
    });

    if (existing) {
      return null; // Notification already exists
    }

    // Create new notification
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      dueDate: dueDate ? new Date(dueDate) : null,
      link,
      notificationKey,
      status: 'unread'
    });

    return notification;
  } catch (error) {
    console.error('[Notification Service] Error creating notification:', error);
    // If it's a duplicate key error, that's okay - just return null
    if (error.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    throw error;
  }
}

/**
 * Create notifications for all admin users
 */
async function createNotificationForAllAdmins({
  type,
  title,
  message,
  dueDate,
  link,
  entityId
}) {
  const User = require('../../models/User');
  
  try {
    // Get all admin users
    const admins = await User.findAll({
      where: { role: 'admin' }
    });

    const notifications = [];
    for (const admin of admins) {
      const notification = await createNotificationIfNotExists({
        userId: admin.uid,
        type,
        title,
        message,
        dueDate,
        link,
        entityId
      });
      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error creating notifications for admins:', error);
    throw error;
  }
}

/**
 * Check passport expiries (60 days before)
 */
async function checkPassportExpiries() {
  const Employee = require('../../models/Employee');
  
  try {
    // Use current date - check if expiry is exactly 60 days away
    const today = dayjs();
    const thresholdDate = today.add(60, 'day').endOf('day').toDate();
    const startDate = today.startOf('day').toDate();

    const employees = await Employee.findAll({
      where: {
        passportExpiry: {
          [sequelize.Sequelize.Op.between]: [startDate, thresholdDate]
        }
      }
    });

    const notifications = [];
    for (const employee of employees) {
      if (!employee.passportExpiry) continue;

      const expiryDate = dayjs(employee.passportExpiry);
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      // Notify if between 60-59 days before (to catch it on the day it hits 60 days)
      if (daysUntilExpiry >= 59 && daysUntilExpiry <= 60) {
        const notification = await createNotificationForAllAdmins({
          type: 'passport_expiry',
          title: 'Passport Expiring Soon',
          message: `Passport for ${employee.fullName} will expire on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: employee.passportExpiry,
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error checking passport expiries:', error);
    throw error;
  }
}

/**
 * Check visa expiries (60 days before)
 */
async function checkVisaExpiries() {
  const Employee = require('../../models/Employee');
  
  try {
    // Use UAE time (UTC+4) - adjust by 4 hours
    const today = dayjs().utcOffset(4 * 60);
    const thresholdDate = today.add(60, 'day').endOf('day').toDate();
    const startDate = today.startOf('day').toDate();

    const employees = await Employee.findAll({
      where: {
        visaExpiry: {
          [sequelize.Sequelize.Op.between]: [startDate, thresholdDate]
        }
      }
    });

    const notifications = [];
    for (const employee of employees) {
      if (!employee.visaExpiry) continue;

      const expiryDate = dayjs(employee.visaExpiry);
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      // Notify if between 60-59 days before
      if (daysUntilExpiry >= 59 && daysUntilExpiry <= 60) {
        const notification = await createNotificationForAllAdmins({
          type: 'visa_expiry',
          title: 'Visa Expiring Soon',
          message: `Visa for ${employee.fullName} expires on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: employee.visaExpiry,
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error checking visa expiries:', error);
    throw error;
  }
}

/**
 * Check contract expiries (30 days before)
 */
async function checkContractExpiries() {
  const Contract = require('../../models/Contract');
  const Employee = require('../../models/Employee');
  
  try {
    // Use UAE time (UTC+4) - adjust by 4 hours
    const today = dayjs().utcOffset(4 * 60);
    const thresholdDate = today.add(30, 'day').endOf('day').toDate();
    const startDate = today.startOf('day').toDate();

    const contracts = await Contract.findAll({
      where: {
        endDate: {
          [sequelize.Sequelize.Op.between]: [startDate, thresholdDate]
        },
        status: 'active'
      }
    });

    const notifications = [];
    for (const contract of contracts) {
      if (!contract.endDate) continue;

      const expiryDate = dayjs(contract.endDate);
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      // Notify if between 30-29 days before
      if (daysUntilExpiry >= 29 && daysUntilExpiry <= 30) {
        // Fetch employee to get name
        let employeeName = 'Employee';
        try {
          const employee = await Employee.findByPk(contract.employeeId);
          if (employee) {
            employeeName = employee.fullName;
          }
        } catch (err) {
          console.warn(`[Notification Service] Could not fetch employee for contract ${contract.id}`);
        }

        const notification = await createNotificationForAllAdmins({
          type: 'contract_expiry',
          title: 'Contract Ending Soon',
          message: `Contract for ${employeeName} ends on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: contract.endDate,
          link: `/hr/contracts/${contract.id}`,
          entityId: `contract_${contract.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error checking contract expiries:', error);
    throw error;
  }
}

/**
 * Check trade license expiry (30 days before)
 * Note: This uses company config - you may need to add licenseExpiry to company config
 */
async function checkLicenseExpiry() {
  try {
    // For now, we'll use a placeholder. You can add licenseExpiry to company config
    // or create a separate settings table
    const companyConfig = require('../config/company');
    
    // If license expiry is stored in env or config, use it
    const licenseExpiry = process.env.LICENSE_EXPIRY || null;
    
    if (!licenseExpiry) {
      return []; // No license expiry configured
    }

    // Use current date
    const today = dayjs();
    const expiryDate = dayjs(licenseExpiry);
    const daysUntilExpiry = expiryDate.diff(today, 'day');

    // Notify if between 30-29 days before
    if (daysUntilExpiry >= 29 && daysUntilExpiry <= 30) {
      const notification = await createNotificationForAllAdmins({
        type: 'license_expiry',
        title: 'Trade License Renewal Due',
        message: `Your trade license expires on ${expiryDate.format('DD MMM YYYY')}.`,
        dueDate: licenseExpiry,
        link: '/settings/license',
        entityId: 'license_global'
      });
      return notification || [];
    }

    return [];
  } catch (error) {
    console.error('[Notification Service] Error checking license expiry:', error);
    throw error;
  }
}

/**
 * Check VAT filing due date (7 days before)
 * Note: VAT filing is typically monthly - you may need to calculate based on last filing date
 */
async function checkVatDue() {
  try {
    // VAT filing is typically due on the 28th of each month
    // Use UAE time (UTC+4) - adjust by 4 hours
    const today = dayjs().utcOffset(4 * 60);
    const currentMonth = today.month();
    const currentYear = today.year();
    
    // Calculate next VAT due date (28th of current or next month)
    let vatDueDate = dayjs().date(28).month(currentMonth).year(currentYear);
    if (today.date() > 28) {
      vatDueDate = vatDueDate.add(1, 'month');
    }

    const daysUntilDue = vatDueDate.diff(today, 'day');

    // Notify if between 7-6 days before
    if (daysUntilDue >= 6 && daysUntilDue <= 7) {
      const notification = await createNotificationForAllAdmins({
        type: 'vat_due',
        title: 'VAT Filing Due Soon',
        message: `VAT must be filed before ${vatDueDate.format('DD MMM YYYY')}.`,
        dueDate: vatDueDate.toDate(),
        link: '/vat',
        entityId: `vat_${vatDueDate.format('YYYY-MM')}`
      });
      return notification || [];
    }

    return [];
  } catch (error) {
    console.error('[Notification Service] Error checking VAT due:', error);
    throw error;
  }
}

/**
 * Check invoice due dates (7 days before)
 */
async function checkInvoiceDue() {
  const Invoice = require('../../models/Invoice');
  
  try {
    // Use UAE time (UTC+4) - adjust by 4 hours
    const today = dayjs().utcOffset(4 * 60);
    const thresholdDate = today.add(7, 'day').endOf('day').toDate();
    const startDate = today.startOf('day').toDate();

    const invoices = await Invoice.findAll({
      where: {
        dueDate: {
          [sequelize.Sequelize.Op.between]: [startDate, thresholdDate]
        },
        status: {
          [sequelize.Sequelize.Op.notIn]: ['paid', 'cancelled']
        }
      }
    });

    const notifications = [];
    for (const invoice of invoices) {
      if (!invoice.dueDate) continue;

      const dueDate = dayjs(invoice.dueDate);
      const daysUntilDue = dueDate.diff(today, 'day');

      // Notify if between 7-6 days before
      if (daysUntilDue >= 6 && daysUntilDue <= 7) {
        const notification = await createNotificationForAllAdmins({
          type: 'invoice_due',
          title: `Invoice ${invoice.invoiceNumber} is due soon`,
          message: `Invoice ${invoice.invoiceNumber} is due on ${dueDate.format('DD MMM YYYY')}.`,
          dueDate: invoice.dueDate,
          link: `/invoices/${invoice.id}`,
          entityId: `invoice_${invoice.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error checking invoice due dates:', error);
    throw error;
  }
}

/**
 * Run all expiry checks
 */
async function runAllExpiryChecks() {
  try {
    console.log('[Notification Service] Running expiry checks...');
    
    const results = {
      passport: [],
      visa: [],
      contract: [],
      license: [],
      vat: [],
      invoice: []
    };

    results.passport = await checkPassportExpiries();
    results.visa = await checkVisaExpiries();
    results.contract = await checkContractExpiries();
    results.license = await checkLicenseExpiry();
    results.vat = await checkVatDue();
    results.invoice = await checkInvoiceDue();

    const totalCreated = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    console.log(`[Notification Service] ✓ Created ${totalCreated} notifications`);

    return results;
  } catch (error) {
    console.error('[Notification Service] Error running expiry checks:', error);
    throw error;
  }
}

module.exports = {
  createNotificationIfNotExists,
  createNotificationForAllAdmins,
  checkPassportExpiries,
  checkVisaExpiries,
  checkContractExpiries,
  checkLicenseExpiry,
  checkVatDue,
  checkInvoiceDue,
  runAllExpiryChecks,
  generateNotificationKey
};

