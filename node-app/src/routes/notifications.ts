import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import authMiddleware from '../middleware/auth';
import { UserRole } from '../types/auth';

const router = Router();
const notificationController = new NotificationController();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve paginated list of user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of notifications to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: offset
 *         in: query
 *         description: Number of notifications to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [info, success, warning, error]
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       read:
 *                         type: boolean
 *                       data:
 *                         type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     unreadCount:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware.authenticate(), notificationController.getNotifications.bind(notificationController));

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:notificationId/read', authMiddleware.authenticate(), notificationController.markAsRead.bind(notificationController));

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all user notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.patch('/read-all', authMiddleware.authenticate(), notificationController.markAllAsRead.bind(notificationController));

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification deleted
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:notificationId', authMiddleware.authenticate(), notificationController.deleteNotification.bind(notificationController));

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Get the number of unread notifications for the user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/unread-count', authMiddleware.authenticate(), notificationController.getUnreadCount.bind(notificationController));

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     summary: Get notification statistics
 *     description: Get notification statistics for the user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of notifications
 *                 unread:
 *                   type: integer
 *                   description: Number of unread notifications
 *                 byType:
 *                   type: object
 *                   description: Count by notification type
 *                   properties:
 *                     info:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     warning:
 *                       type: integer
 *                     error:
 *                       type: integer
 *                 recent:
 *                   type: integer
 *                   description: Number of notifications in last 24 hours
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authMiddleware.authenticate(), notificationController.getStats.bind(notificationController));

/**
 * @swagger
 * /api/notifications/admin/stats:
 *   get:
 *     summary: Get all notification statistics (Admin only)
 *     description: Get notification statistics for all users (admin only)
 *     tags: [Notifications, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of notifications
 *                 unread:
 *                   type: integer
 *                   description: Number of unread notifications
 *                 byType:
 *                   type: object
 *                   description: Count by notification type
 *                 recent:
 *                   type: integer
 *                   description: Number of notifications in last 24 hours
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/stats', 
  authMiddleware.authenticate(), 
  authMiddleware.requireRole(UserRole.ADMIN), 
  notificationController.getAllStats.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/admin/cleanup:
 *   post:
 *     summary: Cleanup old notifications (Admin only)
 *     description: Delete old read notifications (admin only)
 *     tags: [Notifications, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *                 description: Number of days to keep read notifications
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Old notifications cleaned up
 *                 deletedCount:
 *                   type: integer
 *                   description: Number of notifications deleted
 *                 daysToKeep:
 *                   type: integer
 *                   description: Number of days notifications were kept
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/cleanup', 
  authMiddleware.authenticate(), 
  authMiddleware.requireRole(UserRole.ADMIN), 
  notificationController.cleanupOldNotifications.bind(notificationController)
);

export default router;