import { serve } from '@hono/node-server';
import 'dotenv/config';
import { createApp } from './app/app.js';
import { registerRoutes } from './app/routes.js';
import logger from './config/logger.js';
import { initStorage } from './config/storage.js';
import { env } from './config/env.js';
import { closeEmailQueue } from './modules/email/email.queue.js';
import { startEmailWorker, stopEmailWorker } from './modules/email/email.worker.js';
import { startSubmissionsWorker, stopSubmissionsWorker } from './modules/submissions/submissions.worker.js';
import { closeRedisConnection, ensureRedisConnection } from './queue/redis.js';

const app = createApp();
registerRoutes(app as any);
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down queue services`);
  await Promise.allSettled([stopEmailWorker(), stopSubmissionsWorker(), closeEmailQueue(), closeRedisConnection()]);
  process.exit(0);
}

async function start() {
  await initStorage();
  await ensureRedisConnection();
  startEmailWorker();
  startSubmissionsWorker();

  const port = env.PORT || 4000;
  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' });
  logger.info(`Backend listening on http://localhost:${port}`);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

start().catch((error) => {
  logger.error('Failed to start backend', error);
  process.exit(1);
});