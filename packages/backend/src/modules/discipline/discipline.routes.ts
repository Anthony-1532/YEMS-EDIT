import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as disciplineService from './discipline.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';
import type { AuthUser } from '../../app/middleware.js';

function teacherClassScope(user: AuthUser): string[] {
  const teacherClasses = [...(user.assignedClasses || [])];
  if (user.isClassTeacher && user.classTeacherOf) {
    teacherClasses.push(user.classTeacherOf);
  }
  return Array.from(new Set(teacherClasses));
}

function assertTeacherCanAccessClass(user: AuthUser, className: string | null | undefined): void {
  if (user.role !== 'teacher') return;
  if (!className) throw new ForbiddenError('Class is required');
  if (!teacherClassScope(user).includes(className)) {
    throw new ForbiddenError('You can only access discipline records for your assigned classes');
  }
}

export function createDisciplineRoutes() {
  const app = new Hono();

  // School-wide log for principal/admin/HOD; teachers are scoped to their classes.
  app.get('/', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    if (c.req.query('class')) filters.class = c.req.query('class');
    if (c.req.query('studentId')) filters.studentId = c.req.query('studentId');
    if (c.req.query('severity')) filters.severity = c.req.query('severity');
    if (c.req.query('status')) filters.status = c.req.query('status');
    if (c.req.query('from')) filters.fromDate = c.req.query('from');
    if (c.req.query('to')) filters.toDate = c.req.query('to');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');

    if (user?.role === 'teacher') {
      filters.classes = teacherClassScope(user);
    }

    const data = await disciplineService.getAllIncidents(filters);
    return c.json({ success: true, data });
  });

  // Principal escalation queue (dashboard): everything awaiting a final decision.
  app.get('/queue', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_RESOLVE), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
    const data = await disciplineService.getAllIncidents({ status: 'escalated', limit });
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    assertTeacherCanAccessClass(user, body?.class);
    const data = await disciplineService.logIncident(body, user.id);
    return c.json({ success: true, data }, 201);
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await disciplineService.getIncidentById(id);
    if (!data) return c.json({ success: false, error: 'Discipline incident not found' }, 404);
    assertTeacherCanAccessClass(c.get('authUser'), data.class);
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const existing = await disciplineService.getIncidentById(id);
    if (!existing) return c.json({ success: false, error: 'Discipline incident not found' }, 404);

    // A teacher may only edit incidents they reported, within their class scope.
    if (user?.role === 'teacher') {
      assertTeacherCanAccessClass(user, existing.class);
      if (existing.reportedBy !== user.id) {
        throw new ForbiddenError('You can only edit incidents you reported');
      }
    }

    const body = await c.req.json();
    const data = await disciplineService.updateIncident(id, body);
    return c.json({ success: true, data });
  });

  app.post('/:id/escalate', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_ESCALATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const existing = await disciplineService.getIncidentById(id);
    if (!existing) return c.json({ success: false, error: 'Discipline incident not found' }, 404);
    assertTeacherCanAccessClass(user, existing.class);
    const data = await disciplineService.escalateIncident(id, user.id);
    return c.json({ success: true, data });
  });

  app.post('/:id/resolve', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_RESOLVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await disciplineService.resolveIncident(id, user.id, body);
    return c.json({ success: true, data });
  });

  app.post('/:id/dismiss', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_RESOLVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await disciplineService.dismissIncident(id, user.id, body?.reason ?? '');
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.DISCIPLINE_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await disciplineService.deleteIncident(id);
    return c.json({ success: true });
  });

  return app;
}
