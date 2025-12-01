const { sendEmail } = require('./emailService');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const dayjs = require('dayjs');

/**
 * Send daily notification digest email to all admins
 */
async function sendDailyNotificationDigest(checkResults) {
  try {
    // Get all admin users
    const admins = await User.findAll({
      where: { role: 'admin' }
    });

    if (admins.length === 0) {
      return;
    }

    // Get today's notifications for summary
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();

    const todayNotifications = await Notification.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.between]: [today, tomorrow]
        }
      },
      order: [['createdAt', 'DESC']]
    });

    if (todayNotifications.length === 0) {
      return; // No notifications to send
    }

    // Group notifications by type
    const grouped = {};
    todayNotifications.forEach(notif => {
      if (!grouped[notif.type]) {
        grouped[notif.type] = [];
      }
      grouped[notif.type].push(notif);
    });

    // Build email HTML
    let html = `
      <h2>UAE Compliance & Renewal Reminders</h2>
      <p>You have ${todayNotifications.length} new reminder(s) today:</p>
      <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="text-align: left; border: 1px solid #ddd; padding: 12px;">Type</th>
            <th style="text-align: left; border: 1px solid #ddd; padding: 12px;">Message</th>
            <th style="text-align: left; border: 1px solid #ddd; padding: 12px;">Due Date</th>
          </tr>
        </thead>
        <tbody>
    `;

    todayNotifications.forEach(notif => {
      const dueDateStr = notif.dueDate 
        ? dayjs(notif.dueDate).format('DD MMM YYYY')
        : 'N/A';
      
      html += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 12px;">
            ${getTypeLabel(notif.type)}
          </td>
          <td style="border: 1px solid #ddd; padding: 12px;">
            ${notif.message}
          </td>
          <td style="border: 1px solid #ddd; padding: 12px;">
            ${dueDateStr}
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/notifications" 
           style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View All Notifications
        </a>
      </p>
    `;

    // Send email to all admins
    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: 'UAE Compliance & Renewal Reminders',
        html,
        text: `You have ${todayNotifications.length} new reminder(s) today. Please log in to view details.`
      });
      
      console.log(`[Notification Email] Daily digest sent to ${adminEmails.length} admin(s)`);
    }
  } catch (error) {
    console.error('[Notification Email] Error sending daily digest:', error);
    // Don't throw - email failure shouldn't break the cron job
  }
}

/**
 * Get human-readable label for notification type
 */
function getTypeLabel(type) {
  const labels = {
    'passport_expiry': '🛂 Passport Expiry',
    'visa_expiry': '✈️ Visa Expiry',
    'contract_expiry': '📄 Contract Expiry',
    'license_expiry': '📜 License Expiry',
    'vat_due': '💰 VAT Due',
    'invoice_due': '🧾 Invoice Due'
  };
  return labels[type] || type;
}

module.exports = {
  sendDailyNotificationDigest
};

