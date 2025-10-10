import mongoose, { Schema } from 'mongoose';
import logger from './logger';
import { NotificationService, NotificationData } from '../types/websocket';

// Notification Model
const notificationSchema = new Schema<NotificationData>({
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  data: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model<NotificationData>('Notification', notificationSchema);

export class NotificationService implements NotificationService {
  async createNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<NotificationData> {
    try {
      const newNotification = new Notification(notification);
      await newNotification.save();

      logger.info('Notification created', {
        userId: notification.userId,
        type: notification.type,
        title: notification.title
      });

      return {
        id: newNotification._id.toString(),
        timestamp: newNotification.createdAt.toISOString(),
        read: newNotification.read,
        ...notification
      };
    } catch (error) {
      logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId
      });
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<NotificationData[]> {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return notifications.map(notif => ({
        id: notif._id.toString(),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        userId: notif.userId,
        timestamp: notif.createdAt.toISOString(),
        read: notif.read,
        data: notif.data
      }));
    } catch (error) {
      logger.error('Failed to get user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await Notification.updateOne(
        { _id: notificationId, userId },
        { read: true }
      );

      if (result.matchedCount === 0) {
        throw new Error('Notification not found');
      }

      logger.debug('Notification marked as read', {
        notificationId,
        userId
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId
      });
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );

      logger.info('All notifications marked as read', {
        userId
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId
      });

      if (result.deletedCount === 0) {
        throw new Error('Notification not found');
      }

      logger.debug('Notification deleted', {
        notificationId,
        userId
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId
      });
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false
      });

      return count;
    } catch (error) {
      logger.error('Failed to get unread notification count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  // System notification methods
  async createSystemNotification(
    userId: string, 
    type: 'info' | 'success' | 'warning' | 'error',
    title: string, 
    message: string, 
    data?: any
  ): Promise<NotificationData> {
    return this.createNotification({
      type,
      title,
      message,
      userId,
      data
    });
  }

  async createDocumentNotification(
    userId: string,
    operation: 'create' | 'update' | 'delete',
    collectionName: string,
    documentId: string,
    documentTitle?: string
  ): Promise<NotificationData> {
    const title = `Document ${operation}d`;
    const message = documentTitle 
      ? `Document "${documentTitle}" was ${operation}d in collection "${collectionName}"`
      : `A document was ${operation}d in collection "${collectionName}"`;

    return this.createNotification({
      type: 'info',
      title,
      message,
      userId,
      data: {
        operation,
        collection: collectionName,
        documentId,
        documentTitle
      }
    });
  }

  async createCollectionNotification(
    userId: string,
    operation: 'create' | 'update' | 'delete',
    collectionName: string
  ): Promise<NotificationData> {
    const title = `Collection ${operation}d`;
    const message = `Collection "${collectionName}" was ${operation}d`;

    return this.createNotification({
      type: 'info',
      title,
      message,
      userId,
      data: {
        operation,
        collection: collectionName
      }
    });
  }

  async createUserNotification(
    userId: string,
    operation: 'create' | 'update' | 'delete',
    targetUserId: string,
    targetUserEmail: string
  ): Promise<NotificationData> {
    const title = `User ${operation}d`;
    const message = `User "${targetUserEmail}" was ${operation}d`;

    return this.createNotification({
      type: 'info',
      title,
      message,
      userId,
      data: {
        operation,
        targetUserId,
        targetUserEmail
      }
    });
  }

  async createSecurityNotification(
    userId: string,
    event: string,
    details: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationData> {
    const type = severity === 'critical' || severity === 'high' ? 'error' : 
                 severity === 'medium' ? 'warning' : 'info';

    return this.createNotification({
      type,
      title: `Security Event: ${event}`,
      message: details,
      userId,
      data: {
        event,
        severity,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Cleanup old notifications
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true
      });

      logger.info('Old notifications cleaned up', {
        deletedCount: result.deletedCount,
        cutoffDate
      });

      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old notifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: number;
  }> {
    try {
      const filter = userId ? { userId } : {};
      
      const [total, unread, byType, recent] = await Promise.all([
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, read: false }),
        Notification.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Notification.countDocuments({
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
      ]);

      const typeStats = byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        unread,
        byType: typeStats,
        recent
      };
    } catch (error) {
      logger.error('Failed to get notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }
}

export default new NotificationService();