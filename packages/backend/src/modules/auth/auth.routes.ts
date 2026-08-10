import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, getClientIp, rateLimitMiddleware } from '../../app/middleware.js';
import * as authService from './auth.service.js';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.schema.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { logAudit } from '../audit/audit.service.js';
import { storageService } from '../storage/storage.service.js';
import { validateUploadFile } from '../../shared/validators/file.validator.js';

export function createAuthRoutes() {
  const app = new Hono();
  const authRateLimit = rateLimitMiddleware({
    name: 'auth',
    limit: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
  });

  app.post('/login', authRateLimit, async (c: Context) => {
    try {
      const body = await c.req.json().catch(async () => {
        try {
          const form = await c.req.formData();
          return Object.fromEntries(form.entries());
        } catch {
          return null;
        }
      });
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
      }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password, getClientIp(c));

      // Audit: successful login
      if (result?.user?.id) {
        logAudit({
          action: 'login',
          entityType: 'auth',
          entityId: result.user.id,
          actorId: result.user.id,
          details: { email, ip: getClientIp(c) },
        });
      }

      return c.json({ success: true, data: result });
    } catch (err) {
      logger.error('Login route error', { 
        message: (err as Error)?.message,
        name: (err as Error)?.name,
        stack: (err as Error)?.stack,
      });
      if (typeof err === 'object' && err !== null && 'statusCode' in err) {
        const message = String((err as any).message || '');
        return c.json({ success: false, message: message || 'Internal Server Error' }, (err as any).statusCode);
      }
      return c.json({ success: false, message: 'Internal Server Error' }, 500);
    }
  });

  app.post('/register', authRateLimit, async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const result = await authService.register(parsed.data);

    if (result?.user?.id) {
      logAudit({
        action: 'register',
        entityType: 'auth',
        entityId: result.user.id,
        actorId: result.user.id,
        details: { email: parsed.data.email },
      });
    }

    return c.json({ success: true, data: result });
  });

  app.post('/refresh', async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const tokens = await authService.refresh(parsed.data.refreshToken);
    return c.json({ success: true, data: tokens });
  });

  app.post('/logout', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    if (!user) {
      throw new UnauthorizedError();
    }

    await authService.logout(user.id);

    logAudit({
      action: 'logout',
      entityType: 'auth',
      entityId: user.id,
      actorId: user.id,
      details: { ip: getClientIp(c) },
    });

    return c.json({ success: true });
  });

  app.get('/me', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    if (!user) {
      throw new UnauthorizedError();
    }
    return c.json({ success: true, data: user });
  });

  app.patch('/profile', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    if (!user) {
      throw new UnauthorizedError();
    }
    const body = await c.req.json().catch(() => null);
    if (!body || (!body.name && !body.email && !body.profilePicture)) {
      throw new BadRequestError('Nothing to update');
    }
    const updated = await authService.updateProfile(user.id, body);
    return c.json({ success: true, data: updated });
  });

  app.post('/change-password', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    if (!user) {
      throw new UnauthorizedError();
    }
    const body = await c.req.json().catch(() => null);
    if (!body || !body.oldPassword || !body.newPassword) {
      throw new BadRequestError('Old password and new password are required');
    }
    await authService.changePassword(user.id, body.oldPassword, body.newPassword);
    return c.json({ success: true, message: 'Password changed successfully' });
  });

  app.post('/profile-picture', authMiddleware, async (c: Context) => {
    const user = c.get('authUser');
    if (!user) {
      throw new UnauthorizedError();
    }
    const formData = await c.req.parseBody({ all: true });
    const maybeFile = formData.file;
    if (!maybeFile || typeof (maybeFile as File).arrayBuffer !== 'function') {
      throw new BadRequestError('File is required');
    }
    const file = maybeFile as File;
    validateUploadFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    // Store in a specific avatars folder, using the user's ID and original extension
    const result = await storageService.uploadFile(buffer, file.name, file.type, 'avatars');

    // Update the profile with the returned MinIO URL
    const updated = await authService.updateProfile(user.id, { profilePicture: result.url });
    return c.json({ success: true, data: updated });
  });

  return app;
}
