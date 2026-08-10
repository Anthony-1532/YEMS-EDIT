import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import type { SendEmailPayload } from './email.types.js';

function createTransport() {
  if (env.SMTP_HOST) {
    logger.info('Email transport configured for SMTP delivery', {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
    });

    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  logger.info('Email transport configured for JSON logging');
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = createTransport();

export async function sendEmail(payload: SendEmailPayload): Promise<void> {
  const info = await transport.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  logger.info('Email sent', {
    messageId: info.messageId,
    to: payload.to,
    subject: payload.subject,
  });
}
