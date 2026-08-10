import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as midtermResultsService from './midterm-results.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export function createMidtermResultsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await midtermResultsService.getAllMidtermResults(user.id, user.role, { limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/class/:class', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_READ), async (c: Context) => {
    const className = c.req.param('class') ?? '';
    const data = await midtermResultsService.getMidtermResultsByClass(className);
    return c.json({ success: true, data });
  });

  app.get('/student/:studentId', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_READ), async (c: Context) => {
    const studentId = c.req.param('studentId') ?? '';
    const data = await midtermResultsService.getMidtermResultsByStudentId(studentId);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await midtermResultsService.getMidtermResultById(id);
    if (!data) return c.json({ success: false, error: 'Result not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const data = await midtermResultsService.createMidtermResult(body);
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await midtermResultsService.updateMidtermResult(id, body);
    if (!data) return c.json({ success: false, error: 'Result not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.MIDTERM_RESULTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await midtermResultsService.deleteMidtermResult(id);
    return c.json({ success: true });
  });

  return app;
}