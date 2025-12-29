const express = require('express');
const { sequelize } = require('../server/config/database');
const Notification = require('../models/Notification');
const { authorizeRole } = require('../server/middleware/authMiddleware');
const { setTenantContext } = require('../server/middleware/tenantMiddleware');
const { createNotificationIfNotExists } = require('../server/services/notificationService');

const router = express.Router();

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user
 */
router.get('/', setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    const userId = req.user.uid;

    const where = { 
      userId,
      companyId: req.companyId  // ✅ Filter by companyId for data isolation
    };
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      notifications: notifications.map(n => n.get({ plain: true })),
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Notification] Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;
    const count = await Notification.count({
      where: {
        userId,
        companyId: req.companyId,  // ✅ Filter by companyId for data isolation
        status: 'unread'
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('[Notification] Unread count error:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;

    // First verify the notification exists and belongs to the user and company
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId,  // Ensure user can only update their own notifications
        companyId: req.companyId  // ✅ Filter by companyId for data isolation
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Use raw SQL to avoid date conversion issues with SQL Server
    const dayjs = require('dayjs');
    const updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    await sequelize.query(`
      UPDATE notifications 
      SET status = 'read', updatedAt = ?
      WHERE id = ? AND userId = ? AND companyId = ?
    `, {
      replacements: [updatedAt, notificationId, userId, req.companyId],
      type: sequelize.QueryTypes.UPDATE
    });

    // Fetch the updated notification
    const updatedNotification = await Notification.findOne({
      where: {
        id: notificationId,
        userId,
        companyId: req.companyId  // ✅ Filter by companyId for data isolation
      }
    });

    res.json(updatedNotification.get({ plain: true }));
  } catch (error) {
    console.error('[Notification] Mark read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user
 */
router.patch('/read-all', setTenantContext, async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;

    // Use raw SQL to avoid date conversion issues with SQL Server
    const dayjs = require('dayjs');
    const updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    const [result] = await sequelize.query(`
      UPDATE notifications 
      SET status = 'read', updatedAt = ?
      WHERE userId = ? AND companyId = ? AND status = 'unread'
    `, {
      replacements: [updatedAt, userId, req.companyId],
      type: sequelize.QueryTypes.UPDATE
    });

    // Get the count of updated rows
    const [countResult] = await sequelize.query(`
      SELECT @@ROWCOUNT as updatedCount
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const updatedCount = countResult?.updatedCount || 0;

    res.json({ 
      message: 'All notifications marked as read',
      updatedCount
    });
  } catch (error) {
    console.error('[Notification] Mark all read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

/**
 * POST /api/notifications/test
 * Create a test notification (admin only)
 */
router.post('/test', authorizeRole('admin'), async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;
    const { type = 'invoice_due', title, message, dueDate, link } = req.body;

    const notification = await createNotificationIfNotExists({
      userId,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      dueDate: dueDate || new Date(),
      link: link || '/dashboard',
      entityId: `test_${Date.now()}`
    });

    if (!notification) {
      return res.status(400).json({ message: 'Notification already exists or could not be created' });
    }

    res.status(201).json(notification.get({ plain: true }));
  } catch (error) {
    console.error('[Notification] Test notification error:', error);
    res.status(500).json({ message: 'Failed to create test notification', error: error.message });
  }
});

/**
 * POST /api/notifications/trigger-checks
 * Manually trigger all expiry checks (admin only)
 * Useful for testing the notification system
 */
router.post('/trigger-checks', authorizeRole('admin'), async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { runAllExpiryChecks } = require('../server/services/notificationService');
    
    console.log('[Notification] Manual trigger: Running all expiry checks...');
    const results = await runAllExpiryChecks();
    
    const summary = {
      passport: results.passport?.length || 0,
      visa: results.visa?.length || 0,
      contract: results.contract?.length || 0,
      tradeLicense: results.tradeLicense?.length || 0,
      vatFiling: results.vatFiling?.length || 0,
      invoiceDue: results.invoiceDue?.length || 0,
      total: (results.passport?.length || 0) + 
             (results.visa?.length || 0) + 
             (results.contract?.length || 0) + 
             (results.tradeLicense?.length || 0) + 
             (results.vatFiling?.length || 0) + 
             (results.invoiceDue?.length || 0)
    };

    console.log('[Notification] Manual trigger completed:', summary);

    res.json({
      message: 'Expiry checks completed',
      summary,
      details: results
    });
  } catch (error) {
    console.error('[Notification] Trigger checks error:', error);
    res.status(500).json({ 
      message: 'Failed to trigger expiry checks', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

