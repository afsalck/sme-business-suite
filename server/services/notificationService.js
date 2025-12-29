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

    // Format dueDate properly for SQL Server (YYYY-MM-DD HH:mm:ss)
    let formattedDueDate = null;
    if (dueDate) {
      // Use dayjs to format the date consistently
      formattedDueDate = dayjs(dueDate).format('YYYY-MM-DD HH:mm:ss');
    }

    // Create new notification using raw SQL to avoid date conversion issues
    await sequelize.query(`
      INSERT INTO notifications (userId, type, title, message, dueDate, link, notificationKey, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unread', GETDATE(), GETDATE())
    `, {
      replacements: [
        userId,
        type,
        title,
        message,
        formattedDueDate,
        link || null,
        notificationKey
      ],
      type: sequelize.QueryTypes.INSERT
    });

    // Fetch the created notification using raw SQL to avoid date issues
    const [notifications] = await sequelize.query(`
      SELECT * FROM notifications WHERE notificationKey = ?
    `, {
      replacements: [notificationKey],
      type: sequelize.QueryTypes.SELECT
    });

    if (!notifications || notifications.length === 0) {
      throw new Error('Failed to create notification');
    }

    // Map to Notification model instance
    const notification = Notification.build(notifications[0], { isNewRecord: false });

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
    // Use current date - check if expiry is within 60 days (including today)
    const today = dayjs().startOf('day');
    const thresholdDate = today.add(60, 'day').endOf('day');
    const startDate = today.startOf('day'); // Include today

    console.log('[Notification Service] Checking passport expiries:', {
      startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
      thresholdDate: thresholdDate.format('YYYY-MM-DD HH:mm:ss')
    });

    // Use raw SQL to avoid SQL Server date conversion issues
    // Include dates from today up to 60 days from now
    const sql = `
      SELECT * FROM employees
      WHERE passportExpiry IS NOT NULL
        AND CAST(passportExpiry AS DATE) >= CAST(? AS DATE)
        AND CAST(passportExpiry AS DATE) <= CAST(? AS DATE)
    `;
    
    const employees = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: [
        startDate.format('YYYY-MM-DD'),
        thresholdDate.format('YYYY-MM-DD')
      ],
      model: Employee,
      mapToModel: true
    });

    console.log(`[Notification Service] Found ${employees.length} employees with passport expiries in range`);

    const notifications = [];
    for (const employee of employees) {
      if (!employee.passportExpiry) continue;

      const expiryDate = dayjs(employee.passportExpiry).startOf('day');
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      console.log(`[Notification Service] Employee ${employee.fullName}: passport expires in ${daysUntilExpiry} days`);

      // Notify if expiry is within 60 days (0-60 days, including today)
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
        console.log(`[Notification Service] Creating passport expiry notification for ${employee.fullName}`);
        const notification = await createNotificationForAllAdmins({
          type: 'passport_expiry',
          title: 'Passport Expiring Soon',
          message: `Passport for ${employee.fullName} will expire on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: expiryDate.toDate(), // Use dayjs date object
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_passport_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
          console.log(`[Notification Service] Created ${notification.length} passport notification(s) for ${employee.fullName}`);
        } else {
          console.log(`[Notification Service] No notification created for ${employee.fullName} (may already exist)`);
        }
      }
    }

    console.log(`[Notification Service] Total passport notifications created: ${notifications.length}`);
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
    // Use current date - check if expiry is within 60 days (including today)
    const today = dayjs().startOf('day');
    const thresholdDate = today.add(60, 'day').endOf('day');
    const startDate = today.startOf('day'); // Include today

    console.log('[Notification Service] Checking visa expiries:', {
      startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
      thresholdDate: thresholdDate.format('YYYY-MM-DD HH:mm:ss')
    });

    // Use raw SQL to avoid SQL Server date conversion issues
    // Include dates from today up to 60 days from now
    const sql = `
      SELECT * FROM employees
      WHERE visaExpiry IS NOT NULL
        AND CAST(visaExpiry AS DATE) >= CAST(? AS DATE)
        AND CAST(visaExpiry AS DATE) <= CAST(? AS DATE)
    `;
    
    const employees = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: [
        startDate.format('YYYY-MM-DD'),
        thresholdDate.format('YYYY-MM-DD')
      ],
      model: Employee,
      mapToModel: true
    });

    console.log(`[Notification Service] Found ${employees.length} employees with visa expiries in range`);

    const notifications = [];
    for (const employee of employees) {
      if (!employee.visaExpiry) continue;

      const expiryDate = dayjs(employee.visaExpiry).startOf('day');
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      console.log(`[Notification Service] Employee ${employee.fullName}: visa expires in ${daysUntilExpiry} days`);

      // Notify if expiry is within 60 days (0-60 days, including today)
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
        console.log(`[Notification Service] Creating visa expiry notification for ${employee.fullName}`);
        const notification = await createNotificationForAllAdmins({
          type: 'visa_expiry',
          title: 'Visa Expiring Soon',
          message: `Visa for ${employee.fullName} expires on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: expiryDate.toDate(), // Use dayjs date object
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_visa_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
          console.log(`[Notification Service] Created ${notification.length} visa notification(s) for ${employee.fullName}`);
        } else {
          console.log(`[Notification Service] No notification created for ${employee.fullName} (may already exist)`);
        }
      }
    }

    console.log(`[Notification Service] Total visa notifications created: ${notifications.length}`);
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
    // Use current date - check if expiry is within 30 days
    const today = dayjs();
    const thresholdDate = today.add(30, 'day').endOf('day');
    const startDate = today.startOf('day');

    // Use raw SQL to avoid SQL Server date conversion issues
    const sql = `
      SELECT * FROM contracts
      WHERE endDate IS NOT NULL
        AND endDate >= ?
        AND endDate <= ?
        AND status = 'active'
    `;
    
    const contracts = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: [
        startDate.format('YYYY-MM-DD HH:mm:ss'),
        thresholdDate.format('YYYY-MM-DD HH:mm:ss')
      ],
      model: Contract,
      mapToModel: true
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
          dueDate: expiryDate.toDate(), // Use dayjs date object
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
    // Use current date - check if due date is within 7 days
    const today = dayjs();
    const thresholdDate = today.add(7, 'day').endOf('day');
    const startDate = today.startOf('day');

    // Use raw SQL to avoid SQL Server date conversion issues
    const sql = `
      SELECT * FROM invoices
      WHERE dueDate IS NOT NULL
        AND dueDate >= ?
        AND dueDate <= ?
        AND status NOT IN ('paid', 'cancelled')
    `;
    
    const invoices = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: [
        startDate.format('YYYY-MM-DD HH:mm:ss'),
        thresholdDate.format('YYYY-MM-DD HH:mm:ss')
      ],
      model: Invoice,
      mapToModel: true
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
          dueDate: dueDate.toDate(), // Use dayjs date object
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

/**
 * Check a single employee for expiries and create notifications immediately
 * Called when employee is created or updated
 */
async function checkEmployeeExpiriesImmediate(employee) {
  const dayjs = require('dayjs');
  const today = dayjs().startOf('day');
  const notifications = [];

  try {
    console.log('[Notification Service] Immediate check started for employee:', employee.fullName || employee.id);
    console.log('[Notification Service] Employee data:', {
      id: employee.id,
      fullName: employee.fullName,
      passportExpiry: employee.passportExpiry,
      visaExpiry: employee.visaExpiry
    });

    // Check passport expiry
    if (employee.passportExpiry) {
      const expiryDate = dayjs(employee.passportExpiry).startOf('day');
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      console.log(`[Notification Service] Passport expiry check: ${expiryDate.format('YYYY-MM-DD')}, days until expiry: ${daysUntilExpiry}`);

      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
        console.log(`[Notification Service] ✓ Creating passport notification for ${employee.fullName} (expires in ${daysUntilExpiry} days)`);
        const notification = await createNotificationForAllAdmins({
          type: 'passport_expiry',
          title: 'Passport Expiring Soon',
          message: `Passport for ${employee.fullName} will expire on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: expiryDate.toDate(),
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_passport_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
          console.log(`[Notification Service] ✓ Created ${notification.length} passport notification(s)`);
        } else {
          console.log(`[Notification Service] ⚠️  No passport notification created (may already exist)`);
        }
      } else {
        console.log(`[Notification Service] ⏭️  Passport expiry ${daysUntilExpiry} days away (outside 0-60 day range)`);
      }
    } else {
      console.log('[Notification Service] ⏭️  No passport expiry date');
    }

    // Check visa expiry
    if (employee.visaExpiry) {
      const expiryDate = dayjs(employee.visaExpiry).startOf('day');
      const daysUntilExpiry = expiryDate.diff(today, 'day');

      console.log(`[Notification Service] Visa expiry check: ${expiryDate.format('YYYY-MM-DD')}, days until expiry: ${daysUntilExpiry}`);

      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
        console.log(`[Notification Service] ✓ Creating visa notification for ${employee.fullName} (expires in ${daysUntilExpiry} days)`);
        const notification = await createNotificationForAllAdmins({
          type: 'visa_expiry',
          title: 'Visa Expiring Soon',
          message: `Visa for ${employee.fullName} expires on ${expiryDate.format('DD MMM YYYY')}.`,
          dueDate: expiryDate.toDate(),
          link: `/hr/employees/${employee.id}`,
          entityId: `employee_visa_${employee.id}`
        });
        if (notification && notification.length > 0) {
          notifications.push(...notification);
          console.log(`[Notification Service] ✓ Created ${notification.length} visa notification(s)`);
        } else {
          console.log(`[Notification Service] ⚠️  No visa notification created (may already exist)`);
        }
      } else {
        console.log(`[Notification Service] ⏭️  Visa expiry ${daysUntilExpiry} days away (outside 0-60 day range)`);
      }
    } else {
      console.log('[Notification Service] ⏭️  No visa expiry date');
    }

    console.log(`[Notification Service] Immediate check completed: ${notifications.length} notification(s) created`);
    return notifications;
  } catch (error) {
    console.error('[Notification Service] ❌ Error in immediate employee expiry check:', error);
    console.error('[Notification Service] Error stack:', error.stack);
    // Don't throw - we don't want to break employee creation/update
    return [];
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
  generateNotificationKey,
  checkEmployeeExpiriesImmediate
};

