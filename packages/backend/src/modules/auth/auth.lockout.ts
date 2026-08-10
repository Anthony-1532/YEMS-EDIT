import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { redisConnection } from '../../queue/redis.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { inArray } from 'drizzle-orm';
import { createNotification } from '../notifications/notifications.repo.js';
import { generateId } from '../../shared/utils/auth.utils.js';

type LockoutResult = {
  locked: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function failedAttemptsKey(email: string): string {
  return `auth:failed:${normalizeEmail(email)}`;
}

function lockoutKey(email: string): string {
  return `auth:lock:${normalizeEmail(email)}`;
}

function fallbackResult(): LockoutResult {
  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: env.AUTH_MAX_LOGIN_ATTEMPTS,
  };
}

export async function getLockoutStatus(email: string): Promise<LockoutResult> {
  try {
    const lockKey = lockoutKey(email);
    const ttl = await redisConnection.ttl(lockKey);
    if (ttl > 0) {
      return {
        locked: true,
        retryAfterSeconds: ttl,
        remainingAttempts: 0,
      };
    }

    const attemptsRaw = await redisConnection.get(failedAttemptsKey(email));
    const attempts = attemptsRaw ? Number(attemptsRaw) : 0;
    return {
      locked: false,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(env.AUTH_MAX_LOGIN_ATTEMPTS - attempts, 0),
    };
  } catch (error) {
    logger.error('Failed to read lockout status', { error: (error as Error).message, email: normalizeEmail(email) });
    return fallbackResult();
  }
}

export async function registerFailedLoginAttempt(email: string): Promise<LockoutResult> {
  try {
    const failedKey = failedAttemptsKey(email);
    const lockKey = lockoutKey(email);

    const attempts = await redisConnection.incr(failedKey);
    if (attempts === 1) {
      await redisConnection.expire(failedKey, env.AUTH_LOCKOUT_SECONDS);
    }

    const remainingAttempts = Math.max(env.AUTH_MAX_LOGIN_ATTEMPTS - attempts, 0);
    if (attempts >= env.AUTH_MAX_LOGIN_ATTEMPTS) {
      await redisConnection.set(lockKey, '1', 'EX', env.AUTH_LOCKOUT_SECONDS);
      await redisConnection.del(failedKey);

      // Notify all admin-tier users so they can unlock the account quickly
      notifyAdminsOfLockout(email).catch((err) =>
        logger.error('Failed to send lockout notification', { error: (err as Error).message })
      );

      return {
        locked: true,
        retryAfterSeconds: env.AUTH_LOCKOUT_SECONDS,
        remainingAttempts: 0,
      };
    }

    return {
      locked: false,
      retryAfterSeconds: 0,
      remainingAttempts,
    };
  } catch (error) {
    logger.error('Failed to register login attempt', { error: (error as Error).message, email: normalizeEmail(email) });
    return fallbackResult();
  }
}

/** Clear Redis lockout keys for an account – used by the admin unlock endpoint. */
export async function clearLockout(email: string): Promise<void> {
  await redisConnection.del(failedAttemptsKey(email), lockoutKey(email));
}

/** Fire-and-forget: send a system notification to every admin-tier user. */
async function notifyAdminsOfLockout(email: string): Promise<void> {
  const adminRoles = ['admin', 'superadmin', 'principal', 'hod'] as const;
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, adminRoles));

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        id: generateId(),
        type: 'system',
        title: '🔒 Account Locked',
        message: `Account for ${email} has been temporarily locked after repeated failed login attempts. Click to unlock.`,
        toUserId: admin.id,
        read: false,
      })
    )
  );
}

export async function clearFailedLoginAttempts(email: string): Promise<void> {
  try {
    await redisConnection.del(failedAttemptsKey(email), lockoutKey(email));
  } catch (error) {
    logger.error('Failed to clear login attempts', { error: (error as Error).message, email: normalizeEmail(email) });
  }
}
