import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../app/middleware.js';
import * as principalService from './principal.service.js';

// Oversight/analytics read-layer for the principal. Every route is guarded to
// the principal (and the admin tier, who can see everything). Write actions are
// NOT here — they live in the domain modules (admissions, report-cards,
// discipline, staff-requests, expenses, notifications) which already enforce
// their own permission checks.
const OVERSIGHT_ROLES = ['principal', 'admin', 'superadmin'] as const;

export function createPrincipalRoutes() {
  const app = new Hono();

  app.use('*', authMiddleware, requireRole(...OVERSIGHT_ROLES));

  app.get('/dashboard', async (c: Context) => {
    const data = await principalService.getDashboardSummary();
    return c.json({ success: true, data });
  });

  app.get('/staff-activity', async (c: Context) => {
    const data = await principalService.getStaffActivity();
    return c.json({ success: true, data });
  });

  app.get('/academic/performance', async (c: Context) => {
    const data = await principalService.getAcademicPerformance({
      class: c.req.query('class') || undefined,
      term: c.req.query('term') || undefined,
      session: c.req.query('session') || undefined,
    });
    return c.json({ success: true, data });
  });

  app.get('/attendance/trends', async (c: Context) => {
    const days = Number(c.req.query('days') || 14);
    const data = await principalService.getAttendanceTrends(Number.isFinite(days) ? days : 14);
    return c.json({ success: true, data });
  });

  return app;
}
