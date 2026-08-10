import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as reportsService from './reports.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export function createReportsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.REPORTS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await reportsService.getAllReports(user.id, user.role, { limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/unread', authMiddleware, requirePermission(PERMISSIONS.REPORTS_READ), async (c: Context) => {
    const data = await reportsService.getUnreadReports();
    return c.json({ success: true, data });
  });

  app.get('/user/:userId', authMiddleware, requirePermission(PERMISSIONS.REPORTS_READ), async (c: Context) => {
    const userId = c.req.param('userId') ?? '';
    const data = await reportsService.getReportsByUserId(userId);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.REPORTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await reportsService.getReportById(id);
    if (!data) return c.json({ success: false, error: 'Report not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.REPORTS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await reportsService.createReport({
      userId: user.id,
      userName: user.name,
      ...body,
    });
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id/read', authMiddleware, requirePermission(PERMISSIONS.REPORTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await reportsService.markAsRead(id);
    if (!data) return c.json({ success: false, error: 'Report not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/status', authMiddleware, requirePermission(PERMISSIONS.REPORTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await reportsService.updateStatus(id, body.status);
    if (!data) return c.json({ success: false, error: 'Report not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/resolve', authMiddleware, requirePermission(PERMISSIONS.REPORTS_RESOLVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await reportsService.resolveReport(id);
    if (!data) return c.json({ success: false, error: 'Report not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.REPORTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await reportsService.deleteReport(id);
    return c.json({ success: true });
  });

  return app;
}
