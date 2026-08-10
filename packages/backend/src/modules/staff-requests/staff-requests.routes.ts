import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as staffRequestsService from './staff-requests.service.js';
import { PERMISSIONS, hasPermission } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';

export function createStaffRequestsRoutes() {
  const app = new Hono();

  // Approvers (principal/admin) see every request; a staff member sees only their own.
  app.get('/', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    if (c.req.query('type')) filters.type = c.req.query('type');
    if (c.req.query('status')) filters.status = c.req.query('status');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');

    const canApprove = hasPermission(user.role, PERMISSIONS.STAFF_REQUESTS_APPROVE);
    if (!canApprove) {
      filters.staffId = user.id;
    } else if (c.req.query('staffId')) {
      filters.staffId = c.req.query('staffId');
    }

    const data = await staffRequestsService.getAllRequests(filters);
    return c.json({ success: true, data });
  });

  // Principal approval queue (dashboard).
  app.get('/queue', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_APPROVE), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
    const data = await staffRequestsService.getAllRequests({ status: 'pending', limit });
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await staffRequestsService.createRequest(
      { staffName: user.name, staffRole: user.role, ...body },
      user.id
    );
    return c.json({ success: true, data }, 201);
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const data = await staffRequestsService.getRequestById(id);
    if (!data) return c.json({ success: false, error: 'Staff request not found' }, 404);

    const canApprove = hasPermission(user.role, PERMISSIONS.STAFF_REQUESTS_APPROVE);
    if (!canApprove && data.staffId !== user.id) {
      throw new ForbiddenError('You can only view your own requests');
    }
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const existing = await staffRequestsService.getRequestById(id);
    if (!existing) return c.json({ success: false, error: 'Staff request not found' }, 404);

    const canApprove = hasPermission(user.role, PERMISSIONS.STAFF_REQUESTS_APPROVE);
    if (!canApprove && existing.staffId !== user.id) {
      throw new ForbiddenError('You can only edit your own requests');
    }

    const body = await c.req.json();
    const data = await staffRequestsService.updateRequest(id, body);
    return c.json({ success: true, data });
  });

  app.post('/:id/approve', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await staffRequestsService.approveRequest(id, user.id, body?.reason);
    return c.json({ success: true, data });
  });

  app.post('/:id/reject', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await staffRequestsService.rejectRequest(id, user.id, body?.reason ?? '');
    return c.json({ success: true, data });
  });

  app.post('/:id/cancel', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_CREATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const data = await staffRequestsService.cancelRequest(id, user.id);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.STAFF_REQUESTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await staffRequestsService.deleteRequest(id);
    return c.json({ success: true });
  });

  return app;
}
