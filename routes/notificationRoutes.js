const express = require('express');
const { sequelize } = require('../server/config/database');
const Notification = require('../models/Notification');
const { authorizeRole } = require('../server/middleware/authMiddleware');
const { createNotificationIfNotExists } = require('../server/services/notificationService');

const router = express.Router();

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user
 */
router.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    const userId = req.user.uid;

    const where = { userId };
    
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
router.get('/unread-count', async (req, res) => {
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
router.patch('/:id/read', async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId // Ensure user can only update their own notifications
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.update({ status: 'read' });

    res.json(notification.get({ plain: true }));
  } catch (error) {
    console.error('[Notification] Mark read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user
 */
router.patch('/read-all', async (req, res) => {
  try {
    await sequelize.authenticate();
  } catch (dbError) {
    return res.status(503).json({ message: 'Database connection unavailable' });
  }

  try {
    const userId = req.user.uid;

    const [updatedCount] = await Notification.update(
      { status: 'read' },
      {
        where: {
          userId,
          status: 'unread'
        }
      }
    );

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

module.exports = router;

