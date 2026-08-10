import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as admissionsService from './admissions.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export function createAdmissionsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    let data;
    if (user.role === 'student') {
      data = await admissionsService.getAdmissionsByUserId(user.id!);
    } else {
      data = await admissionsService.getAllAdmissions({ limit, offset });
    }

    return c.json({ success: true, data });
  });

  app.get('/pending', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_READ), async (c: Context) => {
    const data = await admissionsService.getPendingAdmissions();
    return c.json({ success: true, data });
  });

  app.get('/waitlist', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_READ), async (c: Context) => {
    const data = await admissionsService.getWaitlist();
    return c.json({ success: true, data });
  });

  // Reorder the whole waitlist: body { orderedIds: string[] } ranked 1..N.
  app.patch('/waitlist/rank', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_APPROVE), async (c: Context) => {
    const body = await c.req.json();
    const data = await admissionsService.rankWaitlist(body?.orderedIds);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await admissionsService.getAdmissionById(id);
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const data = await admissionsService.createAdmission(body);
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id/approve', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await admissionsService.approveAdmission(id, { decidedBy: user.id, reason: body?.reason });
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/reject', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_REJECT), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await admissionsService.rejectAdmission(id, { decidedBy: user.id, reason: body?.reason });
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/waitlist', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await admissionsService.waitlistAdmission(id, {
      decidedBy: user.id,
      reason: body?.reason,
      score: typeof body?.score === 'number' ? body.score : undefined,
    });
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id/promote', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await admissionsService.promoteFromWaitlist(id, { decidedBy: user.id, reason: body?.reason });
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await admissionsService.updateAdmission(id, body);
    if (!data) return c.json({ success: false, error: 'Admission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.ADMISSIONS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await admissionsService.deleteAdmission(id);
    return c.json({ success: true });
  });

  return app;
}
