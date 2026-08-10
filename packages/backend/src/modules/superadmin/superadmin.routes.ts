import type { Context } from 'hono';
import { Hono } from 'hono';
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import { db } from '../../config/db.js';
import { auditLogs } from '../../db/schema/audit-logs.js';
import { institutions } from '../../db/schema/institutions.js';
import { users } from '../../db/schema/users.js';
import { backups, platformSettings, rbacRoles } from '../../db/schema/platform.js';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../shared/constants/permissions.js';

const PLATFORM_SETTINGS_ID = 'global-platform-settings';

function normalizeRoleKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_');
}

function toTitleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function ensureDefaultPlatformSettings() {
  const [existing] = await db.select().from(platformSettings).where(eq(platformSettings.id, PLATFORM_SETTINGS_ID)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(platformSettings).values({
    id: PLATFORM_SETTINGS_ID,
    platformName: 'Yeshua Educational Platform',
    supportEmail: 'support@yems.local',
    maxUsersPerInstitution: 1000,
    sessionTimeout: 60,
    enable2FA: false,
    forcePasswordChange: true,
  }).returning();
  return created;
}

async function ensureDefaultRoles() {
  const existing = await db.select().from(rbacRoles);
  if (existing.length > 0) return existing;

  const defaults = Object.entries(ROLE_PERMISSIONS).map(([key, permissions]) => ({
    id: crypto.randomUUID(),
    key,
    name: toTitleCase(key),
    description: `${toTitleCase(key)} role`,
    permissions,
  }));
  await db.insert(rbacRoles).values(defaults);
  return db.select().from(rbacRoles);
}

export function createSuperadminRoutes() {
  const app = new Hono();

  app.get('/institutions', authMiddleware, requirePermission(PERMISSIONS.INSTITUTIONS_READ), async (c: Context) => {
    const search = c.req.query('search');
    const status = c.req.query('status');
    const filters = [];
    if (search) filters.push(ilike(institutions.name, `%${search}%`));
    if (status) filters.push(eq(institutions.status, status));
    const where = filters.length ? and(...filters) : undefined;
    const data = await db.select().from(institutions).where(where).orderBy(desc(institutions.createdAt));
    return c.json({ success: true, data });
  });

  app.post('/institutions', authMiddleware, requirePermission(PERMISSIONS.INSTITUTIONS_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const [data] = await db.insert(institutions).values({
      id: crypto.randomUUID(),
      name: body.name,
      address: body.address ?? null,
      contactEmail: body.contactEmail ?? null,
      status: body.status ?? 'active',
      students: body.students ?? 0,
      teachers: body.teachers ?? 0,
    }).returning();
    return c.json({ success: true, data }, 201);
  });

  app.patch('/institutions/:id', authMiddleware, requirePermission(PERMISSIONS.INSTITUTIONS_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const [data] = await db.update(institutions).set({
      name: body.name,
      address: body.address,
      contactEmail: body.contactEmail,
      status: body.status,
      students: body.students,
      teachers: body.teachers,
      updatedAt: new Date(),
    }).where(eq(institutions.id, id)).returning();
    if (!data) return c.json({ success: false, error: 'Institution not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/institutions/:id', authMiddleware, requirePermission(PERMISSIONS.INSTITUTIONS_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await db.delete(institutions).where(eq(institutions.id, id));
    return c.json({ success: true });
  });

  app.get('/platform-settings', authMiddleware, requirePermission(PERMISSIONS.PLATFORM_SETTINGS_READ), async (c: Context) => {
    const data = await ensureDefaultPlatformSettings();
    return c.json({ success: true, data });
  });

  app.patch('/platform-settings', authMiddleware, requirePermission(PERMISSIONS.PLATFORM_SETTINGS_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    await ensureDefaultPlatformSettings();
    const [data] = await db.update(platformSettings).set({
      platformName: body.platformName,
      supportEmail: body.supportEmail,
      maxUsersPerInstitution: body.maxUsersPerInstitution !== undefined ? Number(body.maxUsersPerInstitution) : undefined,
      sessionTimeout: body.sessionTimeout !== undefined ? Number(body.sessionTimeout) : undefined,
      enable2FA: body.enable2FA,
      forcePasswordChange: body.forcePasswordChange,
      updatedAt: new Date(),
    }).where(eq(platformSettings.id, PLATFORM_SETTINGS_ID)).returning();
    return c.json({ success: true, data });
  });

  app.get('/backups', authMiddleware, requirePermission(PERMISSIONS.BACKUPS_READ), async (c: Context) => {
    const data = await db.select().from(backups).orderBy(desc(backups.createdAt));
    return c.json({ success: true, data });
  });

  app.post('/backups', authMiddleware, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const [data] = await db.insert(backups).values({
      id: crypto.randomUUID(),
      name: body.name ?? `Backup ${new Date().toISOString()}`,
      description: body.description ?? 'Manual backup',
      size: body.size ?? '0 MB',
      type: body.type ?? 'manual',
      metadata: body.metadata ?? {},
      updatedAt: new Date(),
    }).returning();
    return c.json({ success: true, data }, 201);
  });

  app.delete('/backups/:id', authMiddleware, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await db.delete(backups).where(eq(backups.id, id));
    return c.json({ success: true });
  });

  app.get('/audit-logs', authMiddleware, requirePermission(PERMISSIONS.AUDIT_READ), async (c: Context) => {
    const limit = Number(c.req.query('limit') || 100);
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
      .limit(limit);

    const actorIds = [...new Set(data.map((log) => log.actorId).filter(Boolean))];
    const actors = actorIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds))
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor.name]));
    const payload = data.map((log) => ({
      ...log,
      user: actorMap.get(log.actorId) ?? 'Unknown User',
    }));

    return c.json({ success: true, data: payload });
  });

  app.delete('/audit-logs', authMiddleware, requirePermission(PERMISSIONS.AUDIT_CLEAR), async (c: Context) => {
    await db.delete(auditLogs);
    return c.json({ success: true });
  });

  app.get('/rbac/roles', authMiddleware, requirePermission(PERMISSIONS.RBAC_READ), async (c: Context) => {
    const rows = await ensureDefaultRoles();
    const data = await Promise.all(rows.map(async (role) => {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, role.key as typeof users.$inferSelect.role));
      return {
        ...role,
        users: countRow?.count ?? 0,
      };
    }));
    return c.json({ success: true, data });
  });

  app.post('/rbac/roles', authMiddleware, requirePermission(PERMISSIONS.RBAC_MANAGE), async (c: Context) => {
    const body = await c.req.json();
    const key = normalizeRoleKey(body.key ?? body.name ?? '');
    const [data] = await db.insert(rbacRoles).values({
      id: crypto.randomUUID(),
      key,
      name: body.name ?? toTitleCase(key),
      description: body.description ?? `${toTitleCase(key)} role`,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      updatedAt: new Date(),
    }).returning();
    return c.json({ success: true, data }, 201);
  });

  app.patch('/rbac/roles/:id', authMiddleware, requirePermission(PERMISSIONS.RBAC_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const [data] = await db.update(rbacRoles).set({
      name: body.name,
      description: body.description,
      permissions: body.permissions,
      updatedAt: new Date(),
    }).where(eq(rbacRoles.id, id)).returning();
    if (!data) return c.json({ success: false, error: 'Role not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/rbac/roles/:id', authMiddleware, requirePermission(PERMISSIONS.RBAC_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await db.delete(rbacRoles).where(eq(rbacRoles.id, id));
    return c.json({ success: true });
  });

  return app;
}
