import type { Context, Next } from 'hono';
import type { AuthUser } from '../../app/middleware.js';
import { logAudit } from './audit.service.js';

/**
 * Middleware factory: logs mutating HTTP requests (POST/PUT/PATCH/DELETE)
 * to the audit_logs table. Must be placed AFTER authMiddleware in the chain
 * so that c.get('authUser') is populated.
 */
export function auditMiddleware() {
  return async (c: Context, next: Next) => {
    await next();

    const method = c.req.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

    const user: AuthUser | undefined = c.get('authUser');
    if (!user) return;

    const status = c.res ? (c.res as Response).status : 0;
    if (status >= 400) return;

    const url = new URL(c.req.url);
    const pathParts = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);

    let entityType = pathParts[0] || 'unknown';
    let entityId: string | null = null;

    // e.g. /api/users/123 → entityType=users, entityId=123
    if (pathParts.length >= 2 && pathParts[1] && !pathParts[1].startsWith('system') && !pathParts[1].startsWith('rbac')) {
      entityId = pathParts[1];
    }

    const action = `${method.toLowerCase()}.${entityType}`;

    logAudit({
      action,
      entityType,
      entityId,
      actorId: user.id,
      details: {
        method,
        path: url.pathname,
        status,
      },
    });
  };
}
