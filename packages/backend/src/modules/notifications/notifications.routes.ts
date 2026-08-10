import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as notificationsService from './notifications.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';

export function createNotificationsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    // All roles get all their notifications (read + unread) for the Topbar diff-polling
    const data = await notificationsService.getAllNotifications(user.id, { limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/unread-count', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const count = await notificationsService.getUnreadCount(user.id);
    return c.json({ success: true, count });
  });

  // IMPORTANT: static paths before /:id to avoid Hono consuming them as param
  app.patch('/read-all', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_UPDATE), async (c: Context) => {
    const user = c.get('authUser');
    await notificationsService.markAllAsRead(user.id);
    return c.json({ success: true });
  });

  app.delete('/clear', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_DELETE), async (c: Context) => {
    const user = c.get('authUser');
    await notificationsService.clearAllNotifications(user.id);
    return c.json({ success: true });
  });

  app.post('/broadcast', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const { type, title, message, targetRole } = await c.req.json();

    const query = db.select({ id: users.id }).from(users);
    if (targetRole && targetRole !== 'all') {
      query.where(eq(users.role, targetRole));
    }
    const recipients = await query;

    const data = await Promise.all(
      recipients.map((r) =>
        notificationsService.createNotification({
          type: type || 'system',
          title,
          message,
          toUserId: r.id,
          fromUserId: user.id,
        })
      )
    );

    return c.json({ success: true, count: data.length });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await notificationsService.createNotification({
      ...body,
      fromUserId: user.id,
    });
    return c.json({ success: true, data }, 201);
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await notificationsService.getNotificationById(id);
    if (!data) return c.json({ success: false, error: 'Notification not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/read', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await notificationsService.markAsRead(id);
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await notificationsService.updateNotification(id, { read: body.read });
    if (!data) return c.json({ success: false, error: 'Notification not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTIFICATIONS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await notificationsService.deleteNotification(id);
    return c.json({ success: true });
  });

  return app;
}
