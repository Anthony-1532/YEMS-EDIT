import { db } from '../../config/db.js';
import { notifications } from '../../db/schema/notifications.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { Notification, NewNotification } from '../../db/schema/notifications.js';

export interface NotificationFilters {
  toUserId?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export async function findAllNotifications(filters?: NotificationFilters): Promise<Notification[]> {
  const conditions = [];

  if (filters?.toUserId) {
    conditions.push(eq(notifications.toUserId, filters.toUserId));
  }

  if (filters?.read !== undefined) {
    conditions.push(eq(notifications.read, filters.read));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findUnreadCountByUserId(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.toUserId, userId), eq(notifications.read, false)));
  return result[0]?.count ?? 0;
}

export async function findNotificationById(id: string): Promise<Notification | undefined> {
  const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return result[0];
}

export async function createNotification(data: {
  id: string;
  type: Notification['type'];
  title: string;
  message: string;
  fromUserId?: string;
  toUserId?: string;
  noteId?: string;
  examId?: string;
  assignmentId?: string;
  date?: string;
  read?: boolean;
}): Promise<Notification> {
  const [notification] = await db.insert(notifications).values({
    id: data.id,
    type: data.type,
    title: data.title,
    message: data.message,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    noteId: data.noteId,
    examId: data.examId,
    assignmentId: data.assignmentId,
    date: data.date,
    read: data.read ?? false,
  }).returning();
  return notification;
}

export async function markAsRead(id: string): Promise<Notification | undefined> {
  const [notification] = await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .returning();
  return notification;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.toUserId, userId));
}

export async function updateNotification(
  id: string,
  data: Partial<Pick<Notification, 'read'>>
): Promise<Notification | undefined> {
  const [notification] = await db
    .update(notifications)
    .set(data)
    .where(eq(notifications.id, id))
    .returning();
  return notification;
}

export async function deleteNotification(id: string): Promise<void> {
  await db.delete(notifications).where(eq(notifications.id, id));
}

export async function clearNotificationsByUserId(userId: string): Promise<void> {
  await db.delete(notifications).where(eq(notifications.toUserId, userId));
}