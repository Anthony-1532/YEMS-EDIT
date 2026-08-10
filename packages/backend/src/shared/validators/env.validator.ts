import { z } from 'zod';

export const zEnv = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/yems'),
  DB_POOL_SIZE: z.coerce.number().default(20),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('yems-files'),

  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_URL: z.string().optional(),
  QUEUE_PREFIX: z.string().default('yems'),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1200),
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().int().positive().default(600),
  TRUST_PROXY_HEADERS: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  TRUSTED_PROXY_IPS: z.string().default('127.0.0.1,::1,::ffff:127.0.0.1'),
  REQUEST_MAX_BODY_SIZE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOCKOUT_SECONDS: z.coerce.number().int().positive().default(900),
  UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default(
      [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ].join(',')
    ),
  EMAIL_FROM: z.string().default('no-reply@yems.local'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export type Env = z.infer<typeof zEnv>;