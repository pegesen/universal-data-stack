import { Request, Response } from 'express';
import notificationService from '../services/notifications';
import logger from '../services/logger';
import { AuthenticatedRequest } from '../types/auth';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Limit must be between 1 and 100'
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Offset must be non-negative'
        });
        return;
      }

      const notifications = await notificationService.getUserNotifications(userId, limit, offset);
      const unreadCount = await notificationService.getUnreadCount(userId);

      logger.debug('Notifications retrieved', {
        userId,
        count: notifications.length,
        unreadCount
      });

      res.json({
        notifications,
        pagination: {
          limit,
          offset,
          total: notifications.length,
          unreadCount
        }
      });
    } catch (error) {
      logger.error('Failed to get notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get notifications',
        message: 'Internal server error'
      });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Notification ID is required'
        });
        return;
      }

      await notificationService.markAsRead(notificationId, userId);

      logger.debug('Notification marked as read', {
        userId,
        notificationId
      });

      res.json({
        message: 'Notification marked as read'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to mark notification as read', {
        error: errorMessage,
        userId: req.user?.id,
        notificationId: req.params.notificationId
      });

      if (errorMessage === 'Notification not found') {
        res.status(404).json({
          error: 'Notification not found',
          message: 'The specified notification was not found'
        });
      } else {
        res.status(500).json({
          error: 'Failed to mark notification as read',
          message: 'Internal server error'
        });
      }
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      await notificationService.markAllAsRead(userId);

      logger.info('All notifications marked as read', {
        userId
      });

      res.json({
        message: 'All notifications marked as read'
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to mark all notifications as read',
        message: 'Internal server error'
      });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Notification ID is required'
        });
        return;
      }

      await notificationService.deleteNotification(notificationId, userId);

      logger.debug('Notification deleted', {
        userId,
        notificationId
      });

      res.json({
        message: 'Notification deleted'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to delete notification', {
        error: errorMessage,
        userId: req.user?.id,
        notificationId: req.params.notificationId
      });

      if (errorMessage === 'Notification not found') {
        res.status(404).json({
          error: 'Notification not found',
          message: 'The specified notification was not found'
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete notification',
          message: 'Internal server error'
        });
      }
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const count = await notificationService.getUnreadCount(userId);

      res.json({
        unreadCount: count
      });
    } catch (error) {
      logger.error('Failed to get unread count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get unread count',
        message: 'Internal server error'
      });
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const stats = await notificationService.getNotificationStats(userId);

      logger.debug('Notification stats retrieved', {
        userId,
        stats
      });

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get notification stats',
        message: 'Internal server error'
      });
    }
  }

  // Admin-only methods
  async getAllStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied',
          message: 'Admin access required'
        });
        return;
      }

      const stats = await notificationService.getNotificationStats();

      logger.debug('All notification stats retrieved', {
        userId,
        stats
      });

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get all notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get notification stats',
        message: 'Internal server error'
      });
    }
  }

  async cleanupOldNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied',
          message: 'Admin access required'
        });
        return;
      }

      const daysToKeep = parseInt(req.body.daysToKeep as string) || 30;

      if (daysToKeep < 1 || daysToKeep > 365) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Days to keep must be between 1 and 365'
        });
        return;
      }

      const deletedCount = await notificationService.cleanupOldNotifications(daysToKeep);

      logger.info('Old notifications cleaned up', {
        userId,
        deletedCount,
        daysToKeep
      });

      res.json({
        message: 'Old notifications cleaned up',
        deletedCount,
        daysToKeep
      });
    } catch (error) {
      logger.error('Failed to cleanup old notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to cleanup old notifications',
        message: 'Internal server error'
      });
    }
  }
}