import { generateId } from '../../shared/utils/auth.utils.js';
import * as notificationsRepo from './notifications.repo.js';
import type { Notification } from '../../db/schema/notifications.js';

export interface GetNotificationsParams {
  read?: boolean;
  limit?: number;
  offset?: number;
}

export async function getAllNotifications(userId: string, params?: GetNotificationsParams): Promise<Notification[]> {
  return notificationsRepo.findAllNotifications({
    toUserId: userId,
    read: params?.read,
    limit: params?.limit,
    offset: params?.offset,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return notificationsRepo.findUnreadCountByUserId(userId);
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const notification = await notificationsRepo.findNotificationById(id);
  return notification || null;
}

export async function createNotification(data: {
  type: Notification['type'];
  title: string;
  message: string;
  fromUserId?: string;
  toUserId?: string;
  noteId?: string;
  examId?: string;
  assignmentId?: string;
  date?: string;
}): Promise<Notification> {
  if (!data.title || !data.message) {
    throw new Error('Title and message are required');
  }

  return notificationsRepo.createNotification({
    id: generateId(),
    ...data,
  });
}

export async function markAsRead(id: string): Promise<Notification | null> {
  const notification = await notificationsRepo.markAsRead(id);
  return notification || null;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  await notificationsRepo.markAllAsRead(userId);
  return true;
}

export async function updateNotification(
  id: string,
  data: Partial<Pick<Notification, 'read'>>
): Promise<Notification | null> {
  const notification = await notificationsRepo.updateNotification(id, data);
  return notification || null;
}

export async function deleteNotification(id: string): Promise<boolean> {
  await notificationsRepo.deleteNotification(id);
  return true;
}

export async function clearAllNotifications(userId: string): Promise<boolean> {
  await notificationsRepo.clearNotificationsByUserId(userId);
  return true;
}