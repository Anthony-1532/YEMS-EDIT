import IORedis from 'ioredis';
import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const hasUpstashHTTP = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
const hasUpstashRedis = !!env.UPSTASH_REDIS_URL;

export const upstashRedis = hasUpstashHTTP
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export const redisConnection = (() => {
  const conn = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis not available - rate limiting and lockout disabled');
        return null;
      }
      return Math.min(times * 300, 2000);
    },
  });

  conn.on('error', (error) => {
    if (!error.message.includes('ECONNREFUSED')) {
      logger.error('Redis connection error', { error: error.message });
    }
  });

  conn.on('connect', () => {
    logger.info('Redis connected');
  });

  conn.on('ready', () => {
    logger.info('Redis ready');
  });

  return conn;
})();

let _bullMqConnection: IORedis | null = null;

function createBullMqConnection(url: string): IORedis {
  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('BullMQ Redis retries exhausted - queue disabled');
        return null;
      }
      return Math.min(times * 300, 2000);
    },
  });

  conn.on('error', (error) => {
    logger.error('BullMQ Redis error', { error: error.message });
  });

  return conn;
}

if (hasUpstashRedis) {
  _bullMqConnection = createBullMqConnection(env.UPSTASH_REDIS_URL!);
} else {
  _bullMqConnection = createBullMqConnection(env.REDIS_URL);
  
  void _bullMqConnection.info('server').then(info => {
    const match = info.match(/redis_version:(\S+)/);
    if (match) {
      const version = match[1]!;
      const parts = version.split('.').map(Number) as [number, number];
      const major = parts[0] ?? 0;
      logger.info(`Detected Redis version: ${version}`);
      if (major < 5) {
        logger.warn(`Redis ${version} is too old for BullMQ (>= 5 required). Queue disabled.`);
        _bullMqConnection?.quit();
        _bullMqConnection = null;
      } else {
        logger.info('BullMQ Redis connection established');
      }
    }
  }).catch(() => {
    logger.warn('BullMQ disabled (Redis unavailable or too old)');
    _bullMqConnection = null;
  });
}

export function getBullMqConnection(): IORedis | null {
  return _bullMqConnection;
}

export async function ensureRedisConnection(): Promise<boolean> {
  if (hasUpstashHTTP && upstashRedis) {
    try {
      await upstashRedis.ping();
      logger.info('Upstash Redis (HTTP) verified');
    } catch (error) {
      logger.warn('Upstash Redis HTTP failed');
    }
  }

  try {
    if (redisConnection.status === 'wait') {
      await redisConnection.connect();
    }
    await redisConnection.ping();
    return true;
  } catch (error) {
    logger.warn('Redis connection failed - rate limiting and lockout may be limited');
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  try {
    if (redisConnection.status === 'ready') {
      await redisConnection.quit();
    } else if (redisConnection.status !== 'end') {
      redisConnection.disconnect();
    }
  } catch (error) {
    // Ignore errors during shutdown
  }
}

export function isQueueAvailable(): boolean {
  return hasUpstashRedis || _bullMqConnection !== null;
}
