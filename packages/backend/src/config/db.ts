import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';
import logger from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_SIZE || 20,
});

export const db = drizzle(pool);

pool.on('connect', () => {
  logger.info('PostgreSQL client connected to pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err);
});

export default db;