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
 * In development mode, can run more frequently for testing
 */
function scheduleNotificationCron() {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development, allow more frequent runs for testing (every 5 minutes)
    // Set NOTIFICATION_CRON_TEST=true in .env to enable
    const testMode = process.env.NOTIFICATION_CRON_TEST === 'true';
    
    let cronSchedule;
    if (testMode && isDevelopment) {
      // Test mode: Run every 5 minutes
      cronSchedule = '*/5 * * * *';
      console.log('⚠️  NOTIFICATION CRON TEST MODE: Running every 5 minutes');
      console.log('   Set NOTIFICATION_CRON_TEST=false in .env to disable');
    } else {
      // Production: Daily at 9 AM UAE time (5 AM UTC)
      cronSchedule = '0 5 * * *';
    }
    
    // Schedule the cron job
    cron.schedule(cronSchedule, async () => {
      try {
        console.log('[Notification Cron] Running daily notification checks at 9 AM UAE time...');
        
        // Run all expiry checks
        const results = await runAllExpiryChecks();
        
        // Send daily digest email (only in production mode)
        if (!testMode) {
          await sendDailyNotificationDigest(results);
        }

        // VAT filing reminders
        await checkVatFilingReminder();
        
        console.log('[Notification Cron] ✓ Daily notification checks completed');
      } catch (error) {
        console.error('[Notification Cron] Error running notification checks:', error);
      }
    }, {
      timezone: 'UTC' // Cron runs in UTC, we adjust time to match UAE
    });

    if (testMode) {
      console.log('✓ Notification cron job scheduled (TEST MODE: every 5 minutes)');
    } else {
      console.log('✓ Notification cron job scheduled (daily at 9 AM UAE time)');
    }
  } catch (error) {
    console.error('⚠️  Failed to schedule notification cron job:', error.message);
    throw error;
  }
}

module.exports = {
  scheduleNotificationCron
};

