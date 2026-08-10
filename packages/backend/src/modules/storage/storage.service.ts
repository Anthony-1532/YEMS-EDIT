import { storageClient, STORAGE_BUCKET } from '../../config/storage.js';
import { generateId } from '../../shared/utils/auth.utils.js';

export const storageService = {
  async uploadFile(
    data: Buffer,
    fileName: string,
    contentType?: string,
    folder?: string
  ): Promise<{ url: string; objectName: string }> {
    const objectName = folder ? `${folder}/${generateId()}_${fileName}` : `${generateId()}_${fileName}`;

    await storageClient.putObject(STORAGE_BUCKET, objectName, data, {
      'Content-Type': contentType || 'application/octet-stream',
    } as any);

    return {
      url: `/api/storage/public/${objectName}`,
      objectName,
    };
  },

  async getFile(objectName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      storageClient.getObject(STORAGE_BUCKET, objectName)
        .then((stream) => {
          stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        })
        .catch(reject);
    });
  },

  async deleteFile(objectName: string): Promise<void> {
    await storageClient.removeObject(STORAGE_BUCKET, objectName);
  },

  async getSignedUrl(objectName: string, expires = 3600): Promise<string> {
    return storageClient.presignedUrl('GET', STORAGE_BUCKET, objectName, expires);
  },

  async getUploadSignedUrl(
    objectName: string,
    _contentType: string,
    expires = 3600
  ): Promise<string> {
    return storageClient.presignedUrl('PUT', STORAGE_BUCKET, objectName, expires);
  },
};