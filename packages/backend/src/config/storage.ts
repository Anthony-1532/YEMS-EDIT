import { Client } from 'minio';
import { env } from './env.js';
import logger from './logger.js';

export const storageClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const STORAGE_BUCKET = env.MINIO_BUCKET || 'yems-files';

/** Race a promise against a timeout. Rejects with a timeout error if the
 *  underlying promise doesn't resolve within `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function initStorage(): Promise<void> {
  try {
    // Hard 5-second deadline for the MinIO probe — if MinIO is unreachable
    // (e.g. the server is on a remote host that is offline) we log a warning
    // and carry on so the API server can still start and serve other routes.
    const exists = await withTimeout(
      storageClient.bucketExists(STORAGE_BUCKET),
      5000,
      'MinIO bucketExists'
    );

    if (!exists) {
      await withTimeout(
        storageClient.makeBucket(STORAGE_BUCKET, 'us-east-1'),
        5000,
        'MinIO makeBucket'
      );
      logger.info(`Created MinIO bucket: ${STORAGE_BUCKET}`);
    }

    try {
      // Use bucket-path resource format which is compatible with MinIO's S3 gateway
      const publicReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${STORAGE_BUCKET}/*`, `arn:aws:s3:::${STORAGE_BUCKET}`],
          },
        ],
      });
      await withTimeout(
        storageClient.setBucketPolicy(STORAGE_BUCKET, publicReadPolicy),
        5000,
        'MinIO setBucketPolicy'
      );
      logger.info(`Set public-read policy on MinIO bucket: ${STORAGE_BUCKET}`);
    } catch {
      // Some MinIO gateway builds reject bucket policies — this is non-fatal,
      // file access still works via presigned URLs. Log at debug level only.
      logger.debug('Bucket policy not set (gateway may not support it) — presigned URLs will still work.');
    }
  } catch (error) {
    // Storage is degraded but NOT fatal — the API server starts regardless.
    // File upload/download endpoints will fail gracefully on their own.
    logger.warn(
      'MinIO storage unavailable — server will start without storage. File operations will fail until MinIO is reachable.',
      { error: (error as Error).message }
    );
  }
}

export default storageClient;