import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as usersService from '../users/users.service.js';
import { db } from '../../config/db.js';
import { subjects } from '../../db/schema/subjects.js';
import { users } from '../../db/schema/users.js';
import { auditLogs } from '../../db/schema/audit-logs.js';
import { classes } from '../../db/schema/classes.js';
import { eq, desc, like, inArray, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { clearLockout, getLockoutStatus } from '../auth/auth.lockout.js';
import { createNotification } from '../notifications/notifications.repo.js';
import { generateId } from '../../shared/utils/auth.utils.js';

export function createAdminRoutes() {
  const app = new Hono();

  app.get('/users', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
    const search = c.req.query('search');
    const role = c.req.query('role');
    const cls = c.req.query('class');
    const limit = Number(c.req.query('limit') || 10000);
    const offset = Number(c.req.query('offset') || 0);

    const users = await usersService.getAllUsers({ search, role, class: cls, limit, offset });
    return c.json({ success: true, data: users });
  });

  app.get('/users/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = await usersService.getUserById(id);
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);
    return c.json({ success: true, data: user });
  });

  app.post('/users', authMiddleware, requirePermission(PERMISSIONS.USERS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const user = await usersService.createUser(body);
    return c.json({ success: true, data: user }, 201);
  });

  app.patch('/users/:id/role', authMiddleware, requirePermission(PERMISSIONS.USERS_ROLE_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = await usersService.updateUser(id, { role: body.role });
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);
    return c.json({ success: true, data: user });
  });

  app.patch('/users/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = await usersService.updateUser(id, {
      name: body.name,
      email: body.email,
      password: body.password,
      studentId: body.studentId,
      teacherId: body.teacherId,
      adminId: body.adminId,
      class: body.class,
      session: body.session,
      term: body.term,
      sex: body.sex,
      admissionNo: body.admissionNo,
      assignedSubjects: body.assignedSubjects,
      assignedClasses: body.assignedClasses,
      isClassTeacher: body.isClassTeacher,
      classTeacherOf: body.classTeacherOf ?? null,
      initials: body.initials,
    });
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);
    return c.json({ success: true, data: user });
  });

   app.post('/users/:id/suspend', authMiddleware, requirePermission(PERMISSIONS.USERS_SUSPEND), async (c: Context) => {
     const id = c.req.param('id') ?? '';
     const [user] = await db.update(users).set({ isSuspended: true }).where(eq(users.id, id)).returning();
     if (!user) return c.json({ success: false, error: 'User not found' }, 404);
     return c.json({ success: true, data: user });
   });

   app.post('/users/:id/unsuspend', authMiddleware, requirePermission(PERMISSIONS.USERS_SUSPEND), async (c: Context) => {
     const id = c.req.param('id') ?? '';
     const [user] = await db.update(users).set({ isSuspended: false }).where(eq(users.id, id)).returning();
     if (!user) return c.json({ success: false, error: 'User not found' }, 404);
     return c.json({ success: true, data: user });
   });

   /**
    * POST /admin/users/:id/unlock-account
    * Clears Redis login-lockout for the user and notifies them.
    */
   app.post('/users/:id/unlock-account', authMiddleware, requirePermission(PERMISSIONS.USERS_SUSPEND), async (c: Context) => {
     const id = c.req.param('id') ?? '';
     const actor = c.get('authUser');

     const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
     if (!user) return c.json({ success: false, error: 'User not found' }, 404);

     // Clear Redis lockout keys
     await clearLockout(user.email);

     // Notify the unlocked user
     await createNotification({
       id: generateId(),
       type: 'system',
       title: '\u2705 Account Unlocked',
       message: `Your account has been unlocked by ${actor?.name ?? 'an administrator'}. You can now log in again.`,
       toUserId: user.id,
       read: false,
     });

     return c.json({ success: true, message: `Account for ${user.email} has been unlocked.` });
   });

   /**
    * GET /admin/users/:id/lockout-status
    * Returns live Redis lockout status so the UI can show a countdown.
    */
   app.get('/users/:id/lockout-status', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
     const id = c.req.param('id') ?? '';
     const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
     if (!user) return c.json({ success: false, error: 'User not found' }, 404);
     const status = await getLockoutStatus(user.email);
     return c.json({ success: true, data: status });
   });


   app.delete('/users/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_DELETE), async (c: Context) => {
     const id = c.req.param('id') ?? '';
     await usersService.deleteUser(id);
     return c.json({ success: true });
   });

   app.get('/subjects', authMiddleware, requirePermission(PERMISSIONS.SUBJECTS_READ), async (c: Context) => {
    const search = c.req.query('search');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    let data;
    if (search) {
      data = await db.select().from(subjects)
        .where(like(subjects.name, `%${search}%`))
        .orderBy(desc(subjects.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      data = await db.select().from(subjects)
        .orderBy(desc(subjects.createdAt))
        .limit(limit)
        .offset(offset);
    }
    return c.json({ success: true, data });
  });

  app.get('/subjects/:id', authMiddleware, requirePermission(PERMISSIONS.SUBJECTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const [data] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    if (!data) return c.json({ success: false, error: 'Subject not found' }, 404);
    return c.json({ success: true, data });
  });

  app.post('/subjects', authMiddleware, requirePermission(PERMISSIONS.SUBJECTS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const [data] = await db.insert(subjects).values({
      id: crypto.randomUUID(),
      name: body.name,
      code: body.code,
      description: body.description,
      category: body.category,
      department: body.department,
    }).returning();
    return c.json({ success: true, data }, 201);
  });

  app.patch('/subjects/:id', authMiddleware, requirePermission(PERMISSIONS.SUBJECTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const [data] = await db.update(subjects).set({
      name: body.name,
      code: body.code,
      description: body.description,
      category: body.category,
      department: body.department,
    }).where(eq(subjects.id, id)).returning();
    if (!data) return c.json({ success: false, error: 'Subject not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/subjects/:id', authMiddleware, requirePermission(PERMISSIONS.SUBJECTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const [deleted] = await db.delete(subjects).where(eq(subjects.id, id)).returning({ id: subjects.id });
    if (!deleted) return c.json({ success: false, error: 'Subject not found' }, 404);
    return c.json({ success: true });
  });

  app.get('/audit/logs', authMiddleware, requirePermission(PERMISSIONS.AUDIT_READ), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.createdAt,
        action: auditLogs.action,
        resource: auditLogs.entityType,
        status: sql<string>`'success'`,
        actorId: auditLogs.actorId,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const actorIds = [...new Set(data.map((log) => log.actorId).filter(Boolean))];
    const actors = actorIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds))
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor.name]));
    const payload = data.map((log) => ({
      ...log,
      user: actorMap.get(log.actorId) ?? 'Unknown User',
    }));

    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
    return c.json({
      success: true,
      data: payload,
      pagination: {
        limit,
        offset,
        total: total?.count ?? 0,
      },
    });
  });

  app.get('/classes', authMiddleware, requirePermission(PERMISSIONS.CLASSES_READ), async (c: Context) => {
    const data = await db.select().from(classes).orderBy(desc(classes.createdAt));
    return c.json({ success: true, data });
  });

  app.post('/classes', authMiddleware, requirePermission(PERMISSIONS.CLASSES_CREATE), async (c: Context) => {
    const body = await c.req.json();
    if (!body.level || !body.stream) {
      return c.json({ success: false, error: 'level and stream are required' }, 400);
    }
    const [existing] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.level, body.level), eq(classes.stream, body.stream)))
      .limit(1);
    if (existing) {
      return c.json({ success: false, error: 'This stream already exists for this level' }, 409);
    }
    const [data] = await db
      .insert(classes)
      .values({
        id: crypto.randomUUID(),
        level: body.level,
        stream: body.stream.trim().toLowerCase(),
        displayName: `${body.level} ${body.stream.trim()}`,
      })
      .returning();
    return c.json({ success: true, data }, 201);
  });

  app.delete('/classes/:id', authMiddleware, requirePermission(PERMISSIONS.CLASSES_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const [deleted] = await db.delete(classes).where(eq(classes.id, id)).returning({ id: classes.id });
    if (!deleted) return c.json({ success: false, error: 'Class not found' }, 404);
    return c.json({ success: true });
  });

  app.get('/stats', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const students = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'student'));
      const teachers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'teacher'));
      const totalSubjects = await db.select({ count: sql<number>`count(*)` }).from(subjects);
      const totalClasses = await db.select({ count: sql<number>`count(*)` }).from(classes);

      return c.json({
        success: true,
        data: {
          total: Number(totalUsers[0]?.count ?? 0),
          students: Number(students[0]?.count ?? 0),
          teachers: Number(teachers[0]?.count ?? 0),
          subjects: Number(totalSubjects[0]?.count ?? 0),
          classes: Number(totalClasses[0]?.count ?? 0),
        }
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.get('/health', authMiddleware, requirePermission(PERMISSIONS.HEALTH_READ), async (c: Context) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    return c.json({ success: true, data: health });
  });

  return app;
}
