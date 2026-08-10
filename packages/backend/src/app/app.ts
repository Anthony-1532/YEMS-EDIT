import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { errorHandler, honoErrorHandler } from '../shared/errors/error-handler.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { rateLimitMiddleware } from './middleware.js';
import { auditMiddleware } from '../modules/audit/audit.middleware.js';

export function createApp() {
  const app = new Hono();
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowAnyOrigin = allowedOrigins.includes('*');

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return undefined;
        if (allowAnyOrigin) return origin;
        return allowedOrigins.includes(origin) ? origin : undefined;
      },
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
      credentials: true,
      maxAge: 600,
    })
  );

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
    if (env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  app.use(
    '/api/*',
    bodyLimit({
      maxSize: env.REQUEST_MAX_BODY_SIZE_BYTES,
      onError: (c) => c.json({ success: false, message: 'Payload too large' }, 413),
    })
  );

  app.use(
    '/api/*',
    rateLimitMiddleware({
      name: 'global-api',
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
    })
  );

  app.use('/api/*', auditMiddleware());

  app.use('*', errorHandler());
  app.onError(honoErrorHandler);

  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    logger.info(`${c.req.method} ${c.req.url} - ${c.res?.status || 0} - ${ms}ms`);
  });

  return app;
}
