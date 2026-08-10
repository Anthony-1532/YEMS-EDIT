import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as expensesService from './expenses.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export function createExpensesRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_READ), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    if (c.req.query('status')) filters.status = c.req.query('status');
    if (c.req.query('category')) filters.category = c.req.query('category');
    if (c.req.query('from')) filters.fromDate = c.req.query('from');
    if (c.req.query('to')) filters.toDate = c.req.query('to');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');

    const data = await expensesService.listExpenses(filters);
    return c.json({ success: true, data });
  });

  // Aggregated totals for the principal financial read-layer / dashboard.
  app.get('/summary', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_READ), async (c: Context) => {
    const filters: any = {};
    if (c.req.query('from')) filters.fromDate = c.req.query('from');
    if (c.req.query('to')) filters.toDate = c.req.query('to');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');

    const data = await expensesService.summarizeExpenses(filters);
    return c.json({ success: true, data });
  });

  // Above-threshold expenses awaiting principal sign-off (dashboard queue).
  app.get('/queue', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_APPROVE), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
    const data = await expensesService.listExpenses({ status: 'pending', limit });
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await expensesService.createExpense(body, user.id, user.name);
    return c.json({ success: true, data }, 201);
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await expensesService.getExpense(id);
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await expensesService.updateExpense(id, body);
    return c.json({ success: true, data });
  });

  app.post('/:id/approve', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await expensesService.approveExpense(id, user.id, body?.reason);
    return c.json({ success: true, data });
  });

  app.post('/:id/reject', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const data = await expensesService.rejectExpense(id, user.id, body?.reason ?? '');
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await expensesService.deleteExpense(id);
    return c.json({ success: true });
  });

  return app;
}
