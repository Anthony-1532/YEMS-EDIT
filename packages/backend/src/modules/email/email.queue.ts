import { Queue } from 'bullmq';
import { env } from '../../config/env.js';
import { getBullMqConnection, isQueueAvailable } from '../../queue/redis.js';
import logger from '../../config/logger.js';
import type { WelcomeEmailJobData } from './email.types.js';

export const EMAIL_QUEUE_NAME = 'email';

const queueConnection = isQueueAvailable() ? getBullMqConnection() : null;

export const emailQueue = queueConnection
  ? new Queue<WelcomeEmailJobData>(EMAIL_QUEUE_NAME, {
      connection: queueConnection,
      prefix: env.QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    })
  : null;

export async function enqueueWelcomeEmailJob(data: WelcomeEmailJobData): Promise<void> {
  if (!emailQueue) {
    logger.warn('Email queue not available - skipping email job');
    return;
  }

  try {
    await emailQueue.add('welcome', data);
    logger.info('Email job enqueued', { email: data.to });
  } catch (error) {
    logger.error('Failed to enqueue email job', { error });
  }
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
  }
}

export function isEmailQueueAvailable(): boolean {
  return !!emailQueue;
}