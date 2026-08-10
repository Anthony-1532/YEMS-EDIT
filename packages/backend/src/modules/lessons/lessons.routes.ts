import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as lessonsService from './lessons.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export function createLessonsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.LESSONS_READ), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await lessonsService.getAllLessons({ limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/live', authMiddleware, requirePermission(PERMISSIONS.LESSONS_READ), async (c: Context) => {
    const data = await lessonsService.getLiveLessons();
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSONS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await lessonsService.getLessonById(id);
    if (!data) return c.json({ success: false, error: 'Lesson not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.LESSONS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const data = await lessonsService.createLesson(body);
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSONS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await lessonsService.updateLesson(id, body);
    if (!data) return c.json({ success: false, error: 'Lesson not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.LESSONS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await lessonsService.deleteLesson(id);
    return c.json({ success: true });
  });

  return app;
}