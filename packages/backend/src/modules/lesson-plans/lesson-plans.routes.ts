import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as lessonPlansService from './lesson-plans.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';

export function createLessonPlansRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_READ), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role === 'accountant') {
      throw new ForbiddenError('Accountants cannot view lesson plans');
    }
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await lessonPlansService.getAllLessonPlans({ limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/subject/:subject', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_READ), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role === 'accountant') {
      throw new ForbiddenError('Accountants cannot view lesson plans');
    }
    const subject = c.req.param('subject') ?? '';
    const data = await lessonPlansService.getLessonPlansBySubject(subject);
    return c.json({ success: true, data });
  });

  app.get('/class/:class', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_READ), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role === 'accountant') {
      throw new ForbiddenError('Accountants cannot view lesson plans');
    }
    const className = c.req.param('class') ?? '';
    const data = await lessonPlansService.getLessonPlansByClass(className);
    return c.json({ success: true, data });
  });

  app.get('/teacher/:teacherId', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_READ), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role === 'accountant') {
      throw new ForbiddenError('Accountants cannot view lesson plans');
    }
    const teacherId = c.req.param('teacherId') ?? '';
    const data = await lessonPlansService.getLessonPlansByTeacherId(teacherId);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_READ), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role === 'accountant') {
      throw new ForbiddenError('Accountants cannot view lesson plans');
    }
    const id = c.req.param('id') ?? '';
    const data = await lessonPlansService.getLessonPlanById(id);
    if (!data) return c.json({ success: false, error: 'Lesson plan not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await lessonPlansService.createLessonPlan({
      ...body,
      createdBy: user.id,
    });
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await lessonPlansService.updateLessonPlan(id, body);
    if (!data) return c.json({ success: false, error: 'Lesson plan not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSON_PLANS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await lessonPlansService.deleteLessonPlan(id);
    return c.json({ success: true });
  });

  return app;
}