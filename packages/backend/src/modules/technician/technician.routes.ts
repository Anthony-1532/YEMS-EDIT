import type { Context } from 'hono';
import { Hono } from 'hono';
import { and, desc, eq, sql, lt } from 'drizzle-orm';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import { db } from '../../config/db.js';
import { auditLogs } from '../../db/schema/audit-logs.js';
import { rbacRoles } from '../../db/schema/platform.js';
import { users } from '../../db/schema/users.js';
import { refreshTokens } from '../../db/schema/refresh-tokens.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import os from 'node:os';
import v8 from 'node:v8';
import { emailQueue } from '../../modules/email/email.queue.js';
import { getSubmissionsQueue, stopSubmissionsWorker, startSubmissionsWorker } from '../../modules/submissions/submissions.worker.js';
import { ensureRedisConnection, isQueueAvailable, redisConnection } from '../../queue/redis.js';
import { v4 as uuid } from 'uuid';

const telemetryEventsStore = new Map<string, Array<{ type: string; timestamp: number; details: any }>>();

export function createTechnicianRoutes() {
  const app = new Hono();

  app.get('/system/health', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    let dbOk = false;
    try {
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch { /* DB unavailable */ }

    const health = {
      status: dbOk ? 'healthy' : 'degraded',
      api: true,
      database: dbOk,
      uptime: process.uptime(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      activeSessions: 0,
      timestamp: new Date().toISOString(),
    };
    return c.json({ success: true, data: health });
  });

  app.get('/system/diagnostics', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    const diagnostics = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      loadAvg: os.loadavg(),
      cpus: os.cpus().length,
      hostname: os.hostname(),
      networkInterfaces: Object.keys(os.networkInterfaces()),
    };
    return c.json({ success: true, data: diagnostics });
  });

  app.get('/system/diagnostics/enhanced', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    let dbLatency = -1;
    let dbStatus = 'unknown';
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    // User counts by role
    const userCountsRows = await db
      .select({ role: users.role, count: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.role);

    const roleKeyMap: Record<string, string> = { student: 'students', teacher: 'teachers', admin: 'admins' };
    const userCounts: Record<string, number> = { total: 0 };
    for (const row of userCountsRows) {
      const key = roleKeyMap[row.role] || row.role;
      userCounts[key] = row.count;
      userCounts.total += row.count;
    }

    // Recent audit entries with actor name via JOIN
    const recentAuditEntries = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorId: auditLogs.actorId,
        actorName: users.name,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    const recentAuditEntriesMapped = recentAuditEntries.map((entry) => ({
      ...entry,
      actor: entry.actorName,
      timestamp: entry.createdAt,
      status: 'success',
    }));

    return c.json({
      success: true,
      data: {
        dbLatency,
        dbStatus,
        userCounts,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          hostname: os.hostname(),
          cpus: os.cpus().length,
          memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          uptime: Math.round(process.uptime()) + 's',
          environment: process.env.NODE_ENV || 'development',
        },
        recentAuditEntries: recentAuditEntriesMapped,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/system/logs', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const entityType = c.req.query('entityType');
    const action = c.req.query('action');

    const filters = [];
    if (entityType) filters.push(eq(auditLogs.entityType, entityType));
    if (action) filters.push(eq(auditLogs.action, action));

    let query = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorId: auditLogs.actorId,
        actorName: users.name,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id));

    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    const rows = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Map DB columns to frontend-expected shape
    const data = rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId,
      actorName: row.actorName || 'System',
      actor: row.actorName || 'System',
      details: row.details ? (typeof row.details === 'string' ? row.details : JSON.stringify(row.details)) : '',
      timestamp: row.createdAt,
      createdAt: row.createdAt,
      status: 'success',
    }));

    return c.json({ success: true, data });
  });

  // ── Active Sessions (Devices) ──────────────────────────────────────────
  app.get('/devices', authMiddleware, requirePermission(PERMISSIONS.DEVICES_READ), async (c: Context) => {
    const activeSessions = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        userName: users.name,
        userRole: users.role,
        userEmail: users.email,
        tokenCreatedAt: refreshTokens.createdAt,
        expiresAt: refreshTokens.expiresAt,
        revoked: refreshTokens.revoked,
      })
      .from(refreshTokens)
      .leftJoin(users, eq(refreshTokens.userId, users.id))
      .where(and(
        eq(refreshTokens.revoked, false),
        sql`${refreshTokens.expiresAt} > NOW()`
      ))
      .orderBy(desc(refreshTokens.createdAt));

    const devices = activeSessions.map((s) => {
      const d = s.tokenCreatedAt;
      const dbUtcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
      const sessionAge = Math.max(Math.round((Date.now() - dbUtcMs) / 1000 / 60), 0);

      return {
        id: s.id,
        userId: s.userId,
        userName: s.userName || 'Unknown',
        userRole: s.userRole || 'unknown',
        userEmail: s.userEmail || '',
        status: 'active' as const,
        lastSeen: s.tokenCreatedAt,
        expiresAt: s.expiresAt,
        sessionAge,
      };
    });

    return c.json({ success: true, data: devices });
  });

  app.get('/devices/:id/telemetry', authMiddleware, requirePermission(PERMISSIONS.DEVICES_READ), async (c: Context) => {
    const deviceId = c.req.param('id') || '';
    if (!deviceId) {
      return c.json({ success: false, error: 'Session ID is required' }, 400);
    }

    const session = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        userName: users.name,
        userRole: users.role,
        userEmail: users.email,
        tokenCreatedAt: refreshTokens.createdAt,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .leftJoin(users, eq(refreshTokens.userId, users.id))
      .where(eq(refreshTokens.id, deviceId))
      .limit(1);

    if (!session.length) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    const s = session[0];
    const memUsage = process.memoryUsage();
    const d = s.tokenCreatedAt;
    const dbUtcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    const ageMinutes = Math.max(Math.round((Date.now() - dbUtcMs) / 1000 / 60), 0);

    const userTelemetry = telemetryEventsStore.get(s.userId) || [];

    return c.json({
      success: true,
      data: {
        sessionId: s.id,
        user: {
          id: s.userId,
          name: s.userName,
          role: s.userRole,
          email: s.userEmail,
        },
        session: {
          createdAt: s.tokenCreatedAt,
          expiresAt: s.expiresAt,
          ageMinutes,
        },
        telemetryEvents: userTelemetry,
        serverMetrics: {
          uptime: Math.round(process.uptime()),
          memoryUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          memoryTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          loadAvg: os.loadavg(),
          cpus: os.cpus().length,
        },
      },
    });
  });

  app.post('/telemetry/event', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json().catch(() => ({}));
    const { type, details } = body;

    if (!type) {
      return c.json({ success: false, error: 'Event type is required' }, 400);
    }

    const userId = user.id;
    if (!telemetryEventsStore.has(userId)) {
      telemetryEventsStore.set(userId, []);
    }

    const events = telemetryEventsStore.get(userId)!;
    events.push({
      type,
      timestamp: Date.now(),
      details: details || {},
    });

    if (events.length > 150) {
      events.shift();
    }

    return c.json({ success: true });
  });

  app.delete('/devices/:id', authMiddleware, requirePermission(PERMISSIONS.DEVICES_MANAGE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.id, id)).limit(1);
    if (!token) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, id));
    return c.json({ success: true, message: 'Session revoked successfully' });
  });

  // ── System Alerts ─────────────────────────────────────────────────────
  app.get('/alerts', authMiddleware, requirePermission(PERMISSIONS.ALERTS_READ), async (c: Context) => {
    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      source: string;
      createdAt: string;
      acknowledged: boolean;
    }> = [];

    // Check DB latency
    let dbLatency = -1;
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
    } catch {
      alerts.push({
        id: 'alert-db-down',
        severity: 'critical',
        title: 'Database Connection Failed',
        description: 'PostgreSQL is unreachable. All data operations are failing.',
        source: 'postgres-db',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
    if (dbLatency > 200) {
      alerts.push({
        id: 'alert-db-slow',
        severity: 'warning',
        title: 'High Database Latency',
        description: `Database response time is ${dbLatency}ms (threshold: 200ms).`,
        source: 'postgres-db',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check Redis
    const redisOk = await ensureRedisConnection();
    if (!redisOk) {
      alerts.push({
        id: 'alert-redis-down',
        severity: 'critical',
        title: 'Redis Cache Offline',
        description: 'Redis is unreachable. Caching, rate limiting, and job queues are disabled.',
        source: 'redis-cache',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check memory usage
    // IMPORTANT: use v8.getHeapStatistics().heap_size_limit — NOT heapTotal.
    // heapTotal is only what V8 has *committed so far* and starts tiny (~47 MB
    // at cold start). heap_size_limit is V8's actual ceiling (typically 1.5 GB
    // on 64-bit Node), so heapUsed/heap_size_limit is the real utilisation.
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const memUsedMB  = Math.round(memUsage.heapUsed  / 1024 / 1024);
    const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
    const rssMB      = Math.round(memUsage.rss / 1024 / 1024);
    const memPercent = Math.round((memUsage.heapUsed / heapStats.heap_size_limit) * 100);
    if (memPercent > 85) {
      alerts.push({
        id: 'alert-memory-high',
        severity: 'critical',
        title: 'High Memory Usage',
        description: `Heap is at ${memPercent}% of V8 limit (${memUsedMB} MB used / ${heapLimitMB} MB limit, RSS ${rssMB} MB). Consider restarting or increasing --max-old-space-size.`,
        source: 'web-api',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    } else if (memPercent > 70) {
      alerts.push({
        id: 'alert-memory-elevated',
        severity: 'warning',
        title: 'Elevated Memory Usage',
        description: `Heap is at ${memPercent}% of V8 limit (${memUsedMB} MB used / ${heapLimitMB} MB limit, RSS ${rssMB} MB).`,
        source: 'web-api',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check load average
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    if (loadAvg[0] > cpuCount * 2) {
      alerts.push({
        id: 'alert-cpu-high',
        severity: 'warning',
        title: 'High CPU Load',
        description: `Load average is ${loadAvg[0].toFixed(2)} across ${cpuCount} cores.`,
        source: 'web-api',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check failed queue jobs
    if (isQueueAvailable() && emailQueue) {
      try {
        const failedCount = await emailQueue.getFailedCount();
        if (failedCount > 10) {
          alerts.push({
            id: 'alert-email-failed',
            severity: 'warning',
            title: 'Email Queue Failures',
            description: `${failedCount} email jobs have failed. Check email worker configuration.`,
            source: 'email-worker',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      } catch { /* ignore */ }
    }

    // Check for suspended users
    const suspendedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isSuspended, true));

    if (suspendedCount[0]?.count > 0) {
      alerts.push({
        id: 'alert-suspended-users',
        severity: 'info',
        title: 'Suspended User Accounts',
        description: `${suspendedCount[0].count} user account(s) are currently suspended.`,
        source: 'users',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check acknowledged alerts from Redis
    if (isQueueAvailable()) {
      for (const alert of alerts) {
        const ack = await redisConnection.get(`alert:ack:${alert.id}`);
        if (ack) {
          alert.acknowledged = true;
        }
      }
    }

    return c.json({ success: true, data: alerts });
  });

  app.patch('/alerts/:id/acknowledge', authMiddleware, requirePermission(PERMISSIONS.ALERTS_MANAGE), async (c: Context) => {
    const alertId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const userId = c.get('authUser')?.id || 'unknown';

    if (isQueueAvailable()) {
      await redisConnection.set(
        `alert:ack:${alertId}`,
        JSON.stringify({
          acknowledgedAt: new Date().toISOString(),
          acknowledgedBy: userId,
          resolutionNote: body.resolutionNote || '',
        }),
        'EX',
        86400 * 7 // 7 days TTL
      );
    }

    return c.json({
      success: true,
      data: {
        id: alertId,
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: userId,
        resolutionNote: body.resolutionNote || '',
      },
    });
  });

  app.get('/rbac/policies', authMiddleware, requirePermission(PERMISSIONS.RBAC_READ), async (c: Context) => {
    const data = await db.select().from(rbacRoles).orderBy(rbacRoles.name);
    return c.json({ success: true, data });
  });

  app.post('/services/:service/restart', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_MANAGE), async (c: Context) => {
    const service = c.req.param('service') || '';
    const body = await c.req.json().catch(() => ({}));
    const idempotencyKey = body.idempotencyKey || '';

    const restartableServices: Record<string, () => Promise<string>> = {
      'submissions-worker': async () => {
        await stopSubmissionsWorker();
        startSubmissionsWorker();
        return 'Submissions worker restarted successfully';
      },
      'email-worker': async () => {
        if (emailQueue) {
          await emailQueue.close();
        }
        return 'Email worker restart initiated (reconnects on next job)';
      },
      'redis-cache': async () => {
        const ok = await ensureRedisConnection();
        return ok ? 'Redis connection re-established' : 'Redis is still offline';
      },
      'postgres-db': async () => {
        try {
          const start = Date.now();
          await db.execute(sql`SELECT 1`);
          return `Database connection verified (${Date.now() - start}ms)`;
        } catch (e: any) {
          throw new Error(`Database connection failed: ${e.message}`);
        }
      },
    };

    const handler = restartableServices[service];
    if (!handler) {
      return c.json({ success: false, error: `Unknown service: ${service}` }, 400);
    }

    try {
      const message = await handler();
      return c.json({
        success: true,
        data: {
          service,
          status: 'restarted',
          idempotencyKey,
          requestedAt: new Date().toISOString(),
          message,
        },
      });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  });

  app.get('/system/queues', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    if (!isQueueAvailable()) {
      return c.json({
        success: false,
        error: 'Queue system is not available (Redis is offline or too old)',
      }, 503);
    }

    try {
      const emailWaiting = emailQueue ? await emailQueue.getWaitingCount() : 0;
      const emailActive = emailQueue ? await emailQueue.getActiveCount() : 0;
      const emailCompleted = emailQueue ? await emailQueue.getCompletedCount() : 0;
      const emailFailed = emailQueue ? await emailQueue.getFailedCount() : 0;

      let subQueue = null;
      try {
        subQueue = getSubmissionsQueue();
      } catch { /* ignore */ }

      const subWaiting = subQueue ? await subQueue.getWaitingCount() : 0;
      const subActive = subQueue ? await subQueue.getActiveCount() : 0;
      const subCompleted = subQueue ? await subQueue.getCompletedCount() : 0;
      const subFailed = subQueue ? await subQueue.getFailedCount() : 0;

      return c.json({
        success: true,
        data: [
          {
            name: 'email',
            displayName: 'Email Delivery Queue',
            waiting: emailWaiting,
            active: emailActive,
            completed: emailCompleted,
            failed: emailFailed,
            concurrency: 1,
          },
          {
            name: 'submissions',
            displayName: 'Submission Grading Queue',
            waiting: subWaiting,
            active: subActive,
            completed: subCompleted,
            failed: subFailed,
            concurrency: 50,
          }
        ]
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.get('/system/services', authMiddleware, requirePermission(PERMISSIONS.SYSTEM_READ), async (c: Context) => {
    let dbStatus = 'operational';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'offline';
    }

    const redisOk = await ensureRedisConnection();
    
    return c.json({
      success: true,
      data: [
        {
          name: 'web-api',
          displayName: 'Web Server API',
          status: 'operational',
          type: 'core',
          throughput: 'high',
          limit: 'rate-limited (100 req/min)',
        },
        {
          name: 'postgres-db',
          displayName: 'PostgreSQL Database',
          status: dbStatus,
          type: 'database',
          throughput: `${dbLatency}ms latency`,
          limit: 'max 20 pool connections',
        },
        {
          name: 'redis-cache',
          displayName: 'Redis Cache & Store',
          status: redisOk ? 'operational' : 'offline',
          type: 'cache',
          throughput: '0ms latency',
          limit: 'max 10000 active clients',
        },
        {
          name: 'email-worker',
          displayName: 'Email Background Worker',
          status: redisOk ? 'operational' : 'offline',
          type: 'worker',
          throughput: '1 concurrency',
          limit: 'no rate limit',
        },
        {
          name: 'submissions-worker',
          displayName: 'Grading Submissions Worker',
          status: redisOk ? 'operational' : 'offline',
          type: 'worker',
          throughput: '50 concurrency',
          limit: 'max 500 bursts',
        }
      ]
    });
  });

  return app;
}
