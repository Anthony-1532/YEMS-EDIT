import type { Context } from 'hono';
import { Hono } from 'hono';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import { db } from '../../config/db.js';
import { accountSettings, bills, payments } from '../../db/schema/accountant.js';
import { users } from '../../db/schema/users.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const SETTINGS_ID = 'global-account-settings';

export function createAccountantRoutes() {
  const app = new Hono();

  app.get('/students', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
    const search = c.req.query('search');
    const role = c.req.query('role') ?? 'student';
    const className = c.req.query('class');
    const limit = Number(c.req.query('limit') || 10000);
    const offset = Number(c.req.query('offset') || 0);

    const filters = [] as any[];
    if (role) filters.push(eq(users.role, role as any));
    if (search) filters.push(eq(users.name, search));
    if (className) filters.push(eq(users.class, className));

    const where = filters.length ? and(...filters) : undefined;
    const data = await db.select().from(users).where(where).limit(limit).offset(offset).orderBy(desc(users.createdAt));
    return c.json({ success: true, data });
  });

  app.get('/bills', authMiddleware, requirePermission(PERMISSIONS.BILLING_READ), async (c: Context) => {
    const studentId = c.req.query('studentId');
    const status = c.req.query('status');
    const user = c.get('authUser');

    let targetStudentId = studentId;
    if (user?.role === 'parent') {
      if (!user.studentId) return c.json({ success: true, data: [] });
      targetStudentId = user.studentId;
    }

    const filters = [];
    if (targetStudentId) filters.push(eq(bills.studentId, targetStudentId));
    if (status) filters.push(eq(bills.status, status));

    const where = filters.length ? and(...filters) : undefined;
    const data = await db.select().from(bills).where(where).orderBy(desc(bills.createdAt));
    return c.json({ success: true, data });
  });

  app.post('/bills', authMiddleware, requirePermission(PERMISSIONS.BILLING_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const [data] = await db.insert(bills).values({
      id: crypto.randomUUID(),
      studentId: body.studentId,
      studentName: body.studentName,
      class: body.class ?? body.studentClass,
      amount: Number(body.amount),
      description: body.description ?? body.subject,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status ?? 'pending',
    }).returning();
    return c.json({ success: true, data }, 201);
  });

  app.patch('/bills/:id', authMiddleware, requirePermission(PERMISSIONS.BILLING_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const patch: Record<string, unknown> = {};
    if (body.amount !== undefined) patch.amount = Number(body.amount);
    if (body.status !== undefined) patch.status = body.status;
    if (body.description !== undefined) patch.description = body.description;
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const [data] = await db.update(bills).set(patch).where(eq(bills.id, id)).returning();
    if (!data) return c.json({ success: false, error: 'Bill not found' }, 404);
    return c.json({ success: true, data });
  });

  app.get('/payments', authMiddleware, requirePermission(PERMISSIONS.BILLING_READ), async (c: Context) => {
    const studentId = c.req.query('studentId');
    const user = c.get('authUser');

    let targetStudentId = studentId;
    if (user?.role === 'parent') {
      if (!user.studentId) return c.json({ success: true, data: [] });
      targetStudentId = user.studentId;
    }

    const filters = [];
    if (targetStudentId) filters.push(eq(payments.studentId, targetStudentId));
    const where = filters.length ? and(...filters) : undefined;

    const data = await db.select().from(payments).where(where).orderBy(desc(payments.paidAt));
    return c.json({ success: true, data });
  });

  app.post('/payments', authMiddleware, requirePermission(PERMISSIONS.BILLING_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const [data] = await db.insert(payments).values({
      id: crypto.randomUUID(),
      billId: body.billId ?? null,
      studentId: body.studentId,
      studentName: body.studentName,
      class: body.class ?? body.studentClass,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod ?? body.method ?? null,
      reference: body.reference ?? null,
      status: body.status ?? 'completed',
      paidAt: body.date ? new Date(body.date) : new Date(),
    }).returning();

    if (body.billId) {
      await db.update(bills).set({ status: 'paid' }).where(eq(bills.id, body.billId));
    } else if (body.studentId) {
      const openBills = await db
        .select({ id: bills.id })
        .from(bills)
        .where(and(eq(bills.studentId, body.studentId), eq(bills.status, 'pending')));
      if (openBills.length) {
        const billIds = openBills.map((bill) => bill.id);
        await db.update(bills).set({ status: 'paid' }).where(inArray(bills.id, billIds));
      }
    }

    return c.json({ success: true, data }, 201);
  });

  app.get('/settings', authMiddleware, requirePermission(PERMISSIONS.BILLING_READ), async (c: Context) => {
    const [data] = await db.select().from(accountSettings).where(eq(accountSettings.id, SETTINGS_ID)).limit(1);

    if (data) {
      return c.json({ success: true, data });
    }

    const [created] = await db.insert(accountSettings).values({
      id: SETTINGS_ID,
      feeAmount: 50000,
      threshold30: 15000,
      threshold70: 35000,
      schoolEmail: 'accounts@yems.local',
      emailSubject: 'School Fee Bill - {student_name}',
      accountNumber: '1234567890',
    }).returning();

    return c.json({ success: true, data: created });
  });

  app.patch('/settings', authMiddleware, requirePermission(PERMISSIONS.BILLING_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const now = new Date();
    const payload = {
      feeAmount: body.feeAmount !== undefined ? Number(body.feeAmount) : undefined,
      threshold30: body.threshold30 !== undefined ? Number(body.threshold30) : undefined,
      threshold70: body.threshold70 !== undefined ? Number(body.threshold70) : undefined,
      schoolEmail: body.schoolEmail,
      emailSubject: body.emailSubject,
      accountNumber: body.accountNumber,
      updatedAt: now,
    };

    const [existing] = await db.select().from(accountSettings).where(eq(accountSettings.id, SETTINGS_ID)).limit(1);
    if (!existing) {
      const [created] = await db.insert(accountSettings).values({
        id: SETTINGS_ID,
        feeAmount: payload.feeAmount ?? 50000,
        threshold30: payload.threshold30 ?? 15000,
        threshold70: payload.threshold70 ?? 35000,
        schoolEmail: payload.schoolEmail ?? 'accounts@yems.local',
        emailSubject: payload.emailSubject ?? 'School Fee Bill - {student_name}',
        accountNumber: payload.accountNumber ?? '1234567890',
      }).returning();
      return c.json({ success: true, data: created });
    }

    const [data] = await db.update(accountSettings).set(payload).where(eq(accountSettings.id, SETTINGS_ID)).returning();
    return c.json({ success: true, data });
  });

  return app;
}
