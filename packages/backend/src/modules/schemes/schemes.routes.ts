import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as schemesService from './schemes.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';

export function createSchemesRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_READ), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const user = c.get('authUser');
    const filters: any = { limit, offset };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
    }

    const data = await schemesService.getAllSchemes(filters);
    return c.json({ success: true, data });
  });

  app.get('/subject/:subject', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_READ), async (c: Context) => {
    const subject = c.req.param('subject') ?? '';
    const user = c.get('authUser');

    if (user?.role === 'teacher' && !user.assignedSubjects?.includes(subject)) {
      throw new ForbiddenError('You are not allowed to view schemes for this subject');
    }

    const data = await schemesService.getSchemesBySubject(subject);
    return c.json({ success: true, data });
  });

  app.get('/class/:class', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_READ), async (c: Context) => {
    const className = c.req.param('class') ?? '';
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      if (!allowedClasses.includes(className)) {
        throw new ForbiddenError('You are not allowed to view schemes for this class');
      }
    }

    const data = await schemesService.getSchemesByClass(className);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await schemesService.getSchemeById(id);
    if (!data) return c.json({ success: false, error: 'Scheme not found' }, 404);

    const user = c.get('authUser');
    if (user?.role === 'teacher' && data.createdBy !== user.id && (!data.subject || !user.assignedSubjects?.includes(data.subject))) {
      throw new ForbiddenError('You are not allowed to view this scheme');
    }

    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();

    if (user?.role === 'teacher' && body.subject && !user.assignedSubjects?.includes(body.subject)) {
      throw new ForbiddenError('You can only create schemes for your assigned subjects');
    }

    const data = await schemesService.createScheme({
      ...body,
      createdBy: user.id,
    });
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const existing = await schemesService.getSchemeById(id);
      if (!existing) return c.json({ success: false, error: 'Scheme not found' }, 404);
      if (existing.createdBy !== user.id) {
        throw new ForbiddenError('You can only modify schemes that you created');
      }
    }

    const data = await schemesService.updateScheme(id, body);
    if (!data) return c.json({ success: false, error: 'Scheme not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.SCHEMES_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const existing = await schemesService.getSchemeById(id);
      if (!existing) return c.json({ success: false, error: 'Scheme not found' }, 404);
      if (existing.createdBy !== user.id) {
        throw new ForbiddenError('You can only delete schemes that you created');
      }
    }

    await schemesService.deleteScheme(id);
    return c.json({ success: true });
  });

  return app;
}