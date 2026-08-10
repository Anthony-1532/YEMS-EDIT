import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as reportCardsService from './report-cards.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';
import type { AuthUser } from '../../app/middleware.js';
import type { ReportCard } from '../../db/schema/report-cards.js';

function teacherClassScope(user: AuthUser): string[] {
  const teacherClasses = [...(user.assignedClasses || [])];
  if (user.isClassTeacher && user.classTeacherOf) {
    teacherClasses.push(user.classTeacherOf);
  }
  return Array.from(new Set(teacherClasses));
}

function isClassTeacherOf(user: AuthUser, className: string | null | undefined): boolean {
  return Boolean(user.isClassTeacher && className && user.classTeacherOf === className);
}

// Compilation and submission are class-teacher duties: a teacher may only act on
// the class they are the class teacher of. Non-teacher roles (admin) pass through.
function assertCanCompile(user: AuthUser, className: string): void {
  if (user.role !== 'teacher') return;
  if (!isClassTeacherOf(user, className)) {
    throw new ForbiddenError('Only the class teacher can compile report cards for a class');
  }
}

function assertCanEdit(user: AuthUser, card: ReportCard): void {
  if (user.role !== 'teacher') return;
  if (card.compiledBy === user.id || isClassTeacherOf(user, card.class)) return;
  throw new ForbiddenError('You can only edit report cards you compiled for your class');
}

export function createReportCardsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_READ), async (c: Context) => {
    const user = c.get('authUser') as AuthUser;
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    if (c.req.query('class')) filters.class = c.req.query('class');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');
    if (c.req.query('studentId')) filters.studentId = c.req.query('studentId');
    const status = c.req.query('status');
    if (status) filters.status = status as ReportCard['status'];

    // Scope by role: teachers see their classes, parents see only their own
    // child's released cards, principal/admin see everything.
    if (user.role === 'teacher') {
      filters.classes = teacherClassScope(user);
    } else if (user.role === 'parent') {
      filters.studentId = user.studentId ?? '__none__';
      filters.statuses = ['sent'];
    }

    const data = await reportCardsService.getAllReportCards(filters);
    return c.json({ success: true, data });
  });

  // Principal's pending-approval queue (feeds the dashboard count).
  app.get('/queue', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_APPROVE), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);
    const data = await reportCardsService.getAllReportCards({ status: 'submitted', limit, offset });
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await reportCardsService.getReportCardById(id);
    if (!data) return c.json({ success: false, error: 'Report card not found' }, 404);

    const user = c.get('authUser') as AuthUser;
    if (user.role === 'teacher' && !teacherClassScope(user).includes(data.class)) {
      throw new ForbiddenError('You can only view report cards for your assigned classes');
    }
    if (user.role === 'parent' && (data.studentId !== user.studentId || data.status !== 'sent')) {
      throw new ForbiddenError('You can only view your own child\'s released report card');
    }

    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_CREATE), async (c: Context) => {
    const user = c.get('authUser') as AuthUser;
    const body = await c.req.json();
    assertCanCompile(user, body.class);
    const data = await reportCardsService.compileReportCard(body, user.id);
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser') as AuthUser;
    const existing = await reportCardsService.getReportCardById(id);
    if (!existing) return c.json({ success: false, error: 'Report card not found' }, 404);
    assertCanEdit(user, existing);

    const body = await c.req.json();
    const data = await reportCardsService.updateReportCard(id, body);
    return c.json({ success: true, data });
  });

  app.post('/:id/submit', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_SUBMIT), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser') as AuthUser;
    const existing = await reportCardsService.getReportCardById(id);
    if (!existing) return c.json({ success: false, error: 'Report card not found' }, 404);
    assertCanEdit(user, existing);

    const data = await reportCardsService.submitReportCard(id);
    return c.json({ success: true, data });
  });

  app.post('/:id/approve', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser') as AuthUser;
    const body = await c.req.json().catch(() => ({}));
    const data = await reportCardsService.approveReportCard(id, user.id, body?.comment);
    if (!data) return c.json({ success: false, error: 'Report card not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/:id/return', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser') as AuthUser;
    const body = await c.req.json().catch(() => ({}));
    const data = await reportCardsService.returnReportCard(id, user.id, body?.comment ?? '');
    if (!data) return c.json({ success: false, error: 'Report card not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/:id/send', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_APPROVE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await reportCardsService.sendReportCard(id);
    if (!data) return c.json({ success: false, error: 'Report card not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.REPORT_CARDS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser') as AuthUser;
    const existing = await reportCardsService.getReportCardById(id);
    if (!existing) return c.json({ success: false, error: 'Report card not found' }, 404);
    assertCanEdit(user, existing);
    await reportCardsService.deleteReportCard(id);
    return c.json({ success: true });
  });

  return app;
}
