import type { MiddlewareHandler } from 'hono';
import type { Context, Next } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { users } from '../db/schema/users.js';
import { db } from '../config/db.js';
import { eq, and } from 'drizzle-orm';
import { refreshTokens } from '../db/schema/refresh-tokens.js';
import { hasPermission } from '../shared/constants/permissions.js';
import { redisConnection } from '../queue/redis.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  studentId?: string | null;
  teacherId?: string | null;
  adminId?: string | null;
  accountantId?: string | null;
  class?: string | null;
  session?: string | null;
  term?: string | null;
  sex?: string | null;
  admissionNo?: string | null;
  assignedSubjects?: string[];
  assignedClasses?: string[];
  isClassTeacher?: boolean | null;
  classTeacherOf?: string | null;
  profilePicture?: string | null;
}

type RateLimitOptions = {
  name: string;
  limit: number;
  windowSeconds: number;
  keyGenerator?: (c: Context) => string;
};

const defaultTrustedProxyIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
const configuredTrustedProxyIps = env.TRUSTED_PROXY_IPS
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);
const trustedProxyIps = new Set([...defaultTrustedProxyIps, ...configuredTrustedProxyIps]);

function getDirectClientIp(c: Context): string {
  try {
    return getConnInfo(c).remote.address || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getForwardedClientIp(c: Context): string | null {
  const xForwardedFor = c.req.header('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = c.req.header('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = c.req.header('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return null;
}

export function getClientIp(c: Context): string {
  const directIp = getDirectClientIp(c);
  if (env.TRUST_PROXY_HEADERS && trustedProxyIps.has(directIp)) {
    const forwardedIp = getForwardedClientIp(c);
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return directIp;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    const cleaned = value.replace(/[{}]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return cleaned;
  }
  return [];
}

export function rateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    if (
      path === '/api/health' ||
      path === '/api/metrics' ||
      path === '/api/status/metrics' ||
      path.startsWith('/health/') ||
      path.startsWith('/api/health/') ||
      (options.name === 'global-api' && (path === '/api/auth' || path.startsWith('/api/auth/')))
    ) {
      await next();
      return;
    }

    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const currentWindow = Math.floor(now / windowMs);

    let identifier = options.keyGenerator ? options.keyGenerator(c) : getClientIp(c);

    // If request contains an Authorization token, extract user ID and role.
    const authHeader = c.req.header('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      try {
        // Verify the token signature so forged/tampered tokens cannot claim a
        // privileged role and bypass rate limiting.
        const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; role?: string } | null;
        // Exempt administrative roles from global rate limiting
        if (decoded?.role && ['admin', 'superadmin', 'principal', 'technician'].includes(decoded.role)) {
          await next();
          return;
        }
        if (decoded?.sub) {
          identifier = `user:${decoded.sub}`;
        }
      } catch {
        // Fallback to IP if token is malformed
      }
    }

    const key = `rate-limit:${options.name}:${identifier}:${currentWindow}`;
    const retryAfterSeconds = Math.max(options.windowSeconds - Math.floor((now % windowMs) / 1000), 1);

    let currentCount = 0;
    try {
      currentCount = await redisConnection.incr(key);
      if (currentCount === 1) {
        await redisConnection.expire(key, options.windowSeconds);
      }
    } catch (error) {
      logger.error('Rate limit backend unavailable; request allowed', {
        error: (error as Error).message,
        limiter: options.name,
        identifier,
      });
      await next();
      return;
    }

    const remaining = Math.max(options.limit - currentCount, 0);
    c.header('X-RateLimit-Limit', String(options.limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.floor(now / 1000) + retryAfterSeconds));

    if (currentCount > options.limit) {
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json({ success: false, message: 'Too many requests. Please try again later.' }, 429);
    }

    await next();
  };
}

export const authMiddleware: MiddlewareHandler<{ Variables: AuthUser }> = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string; name: string; role: string; sessionId?: string };
    
    if (decoded.sessionId) {
      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.id, decoded.sessionId), eq(refreshTokens.revoked, false)))
        .limit(1);
      if (!tokenRecord) {
        return c.json({ success: false, message: 'Unauthorized (Session revoked)' }, 401);
      }
    }

    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub)).limit(1);

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 401);
    }

    if (user.isSuspended) {
      return c.json({ success: false, message: 'Account suspended' }, 403);
    }

    c.set('authUser', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      teacherId: user.teacherId,
      adminId: user.adminId,
      accountantId: user.accountantId,
      class: user.class,
      session: user.session,
      term: user.term,
      sex: user.sex,
      admissionNo: user.admissionNo,
      assignedSubjects: parseStringArray(user.assignedSubjects),
      assignedClasses: parseStringArray(user.assignedClasses),
      isClassTeacher: user.isClassTeacher,
      classTeacherOf: user.classTeacherOf,
      profilePicture: user.profilePicture,
    });

    await next();
  } catch {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

export function requireRole(...roles: string[]): MiddlewareHandler<{ Variables: AuthUser }> {
  return async (c: Context, next: Next) => {
    const user = c.get('authUser');
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, message: 'Forbidden', code: 'INSUFFICIENT_ROLE' }, 403);
    }
    await next();
  };
}

export function requirePermission(...permissions: string[]): MiddlewareHandler<{ Variables: AuthUser }> {
  return async (c: Context, next: Next) => {
    const user = c.get('authUser');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    for (const permission of permissions) {
      if (!hasPermission(user.role, permission)) {
        return c.json({ 
          success: false, 
          message: 'Forbidden', 
          code: 'INSUFFICIENT_PERMISSION',
          required: permission,
          userRole: user.role 
        }, 403);
      }
    }

    await next();
  };
}

export function requireAnyPermission(...permissions: string[]): MiddlewareHandler<{ Variables: AuthUser }> {
  return async (c: Context, next: Next) => {
    const user = c.get('authUser');
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const hasAny = permissions.some(permission => hasPermission(user.role, permission));
    if (!hasAny) {
      return c.json({ 
        success: false, 
        message: 'Forbidden', 
        code: 'INSUFFICIENT_PERMISSION',
        required: permissions,
        userRole: user.role 
      }, 403);
    }

    await next();
  };
}