import type { Context, Next, ErrorHandler } from 'hono';
import { AppError } from './app-error.js';
import logger from '../../config/logger.js';

function isAppError(err: unknown): err is AppError & { statusCode: number } {
  if (err instanceof AppError) return true;
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'isOperational' in err;
}

export const honoErrorHandler: ErrorHandler = (err, c) => {
  if (isAppError(err)) {
    return c.json({ success: false, message: err.message }, err.statusCode as any);
  }

  logger.error('Unhandled error', { 
    message: (err as Error)?.message,
    name: (err as Error)?.name,
    stack: (err as Error)?.stack,
    constructor: (err as any)?.constructor?.name,
    keys: typeof err === 'object' ? Object.keys(err as object) : typeof err,
  });

  return c.json(
    { success: false, message: 'Internal Server Error' },
    500 as any
  );
};

export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      return honoErrorHandler(err as Error, c);
    }
  };
}