import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationsRepo from '../notifications/notifications.repo.js';
import * as notificationsService from '../notifications/notifications.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: () => Promise.resolve([]),
        }),
        orderBy: () => Promise.resolve([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllNotifications', () => {
    it('should return notifications for user', async () => {
      const mockNotifications = [
        { id: '1', title: 'New Alert', toUserId: 'user-1', read: false },
        { id: '2', title: 'Another Alert', toUserId: 'user-1', read: true },
      ];
      
      vi.spyOn(notificationsRepo, 'findAllNotifications').mockResolvedValue(mockNotifications as any);
      
      const result = await notificationsService.getAllNotifications('user-1');
      
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      vi.spyOn(notificationsRepo, 'findUnreadCountByUserId').mockResolvedValue(3);
      
      const result = await notificationsService.getUnreadCount('user-1');
      
      expect(result).toBe(3);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found', async () => {
      const mockNotification = { id: '1', title: 'Alert' };
      vi.spyOn(notificationsRepo, 'findNotificationById').mockResolvedValue(mockNotification as any);
      
      const result = await notificationsService.getNotificationById('1');
      
      expect(result).toEqual(mockNotification);
    });

    it('should return null when not found', async () => {
      vi.spyOn(notificationsRepo, 'findNotificationById').mockResolvedValue(undefined);
      
      const result = await notificationsService.getNotificationById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createNotification', () => {
    it('should create notification with valid data', async () => {
      const notificationData = {
        type: 'system' as const,
        title: 'Test Notification',
        message: 'This is a test',
      };
      
      const created = { id: 'new-id', ...notificationData, read: false };
      vi.spyOn(notificationsRepo, 'createNotification').mockResolvedValue(created as any);
      
      const result = await notificationsService.createNotification(notificationData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when title is missing', async () => {
      const notificationData = {
        type: 'system' as const,
        message: 'Test message',
      };
      
      await expect(notificationsService.createNotification(notificationData as any)).rejects.toThrow('Title and message are required');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updated = { id: '1', read: true };
      vi.spyOn(notificationsRepo, 'markAsRead').mockResolvedValue(updated as any);
      
      const result = await notificationsService.markAsRead('1');
      
      expect(result?.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.spyOn(notificationsRepo, 'markAllAsRead').mockResolvedValue(undefined);
      
      const result = await notificationsService.markAllAsRead('user-1');
      
      expect(result).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(notificationsRepo, 'deleteNotification').mockResolvedValue(undefined);
      
      const result = await notificationsService.deleteNotification('1');
      
      expect(result).toBe(true);
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications for user', async () => {
      vi.spyOn(notificationsRepo, 'clearNotificationsByUserId').mockResolvedValue(undefined);
      
      const result = await notificationsService.clearAllNotifications('user-1');
      
      expect(result).toBe(true);
    });
  });
});