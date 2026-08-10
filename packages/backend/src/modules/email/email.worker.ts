import { Worker } from 'bullmq';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { getBullMqConnection } from '../../queue/redis.js';
import { sendEmail } from './email.service.js';
import { EMAIL_QUEUE_NAME } from './email.queue.js';
import type { WelcomeEmailJobData } from './email.types.js';

let emailWorker: Worker<WelcomeEmailJobData> | null = null;

function renderWelcomeEmail(name: string) {
  const subject = 'Welcome to YEMS';
  const text = `Hello ${name}, welcome to Yeshua Educational Management System (YEMS).`;
  const html = `<p>Hello ${name},</p><p>Welcome to Yeshua Educational Management System (YEMS).</p>`;
  return { subject, text, html };
}

export function startEmailWorker(): Worker<WelcomeEmailJobData> {
  if (emailWorker) {
    return emailWorker;
  }

  const bullMqConn = getBullMqConnection();
  if (!bullMqConn) {
    logger.warn('BullMQ connection not available - email worker not started');
    return null as any;
  }

  emailWorker = new Worker<WelcomeEmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      if (job.name !== 'welcome') {
        throw new Error(`Unsupported email job: ${job.name}`);
      }

      const message = renderWelcomeEmail(job.data.name);
      await sendEmail({
        to: job.data.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
    {
      connection: bullMqConn,
      prefix: env.QUEUE_PREFIX,
    }
  );

  emailWorker.on('completed', (job) => {
    logger.info('Email job completed', { jobId: job.id, jobName: job.name });
  });

  emailWorker.on('failed', (job, error) => {
    logger.error('Email job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
    });
  });

  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (!emailWorker) return;
  await emailWorker.close();
  emailWorker = null;
}
