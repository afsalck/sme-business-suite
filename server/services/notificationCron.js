const cron = require('node-cron');
const dayjs = require('dayjs');
const { runAllExpiryChecks, createNotificationForAllAdmins } = require('./notificationService');
const { sendDailyNotificationDigest } = require('./notificationEmailService');
const { getVatSettings, getNextFilingDeadline } = require('./vatService');

async function checkVatFilingReminder() {
  const settings = await getVatSettings({ companyId: 1 });
  if (!settings || !settings.vatEnabled) {
    return;
  }

  const deadline = dayjs(getNextFilingDeadline(settings));
  const daysUntilDeadline = deadline.diff(dayjs(), 'day');

  if (daysUntilDeadline === 7) {
    await createNotificationForAllAdmins({
      type: 'vat_due',
      title: 'VAT Filing Due Soon',
      message: `VAT return must be filed before ${deadline.format('DD MMM YYYY')}.`,
      dueDate: deadline.toDate(),
      link: '/vat',
      entityId: `vat_filing_${deadline.format('YYYY_MM')}`
    });
  }
}

/**
 * Schedule notification cron job
 * Runs daily at 9 AM UAE time (5 AM UTC)
 */
function scheduleNotificationCron() {
  try {
    // Schedule for 9 AM UAE time (UTC+4) = 5 AM UTC
    // Cron format: minute hour day month weekday
    cron.schedule('0 5 * * *', async () => {
      try {
        console.log('[Notification Cron] Running daily notification checks at 9 AM UAE time...');
        
        // Run all expiry checks
        const results = await runAllExpiryChecks();
        
        // Send daily digest email
        await sendDailyNotificationDigest(results);

        // VAT filing reminders
        await checkVatFilingReminder();
        
        console.log('[Notification Cron] ✓ Daily notification checks completed');
      } catch (error) {
        console.error('[Notification Cron] Error running notification checks:', error);
      }
    }, {
      timezone: 'UTC' // Cron runs in UTC, we adjust time to match UAE
    });

    console.log('✓ Notification cron job scheduled (daily at 9 AM UAE time)');
  } catch (error) {
    console.error('⚠️  Failed to schedule notification cron job:', error.message);
    throw error;
  }
}

module.exports = {
  scheduleNotificationCron
};

