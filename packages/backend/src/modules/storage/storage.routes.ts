import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import { storageService } from './storage.service.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { validateUploadFile } from '../../shared/validators/file.validator.js';
import logger from '../../config/logger.js';

export function createStorageRoutes() {
  const app = new Hono();

  // Public access routes (NO authMiddleware or permissions required)
  app.get('/public/:folder/:fileName', async (c: Context) => {
    const folder = c.req.param('folder');
    const fileName = c.req.param('fileName');
    if (!folder || !fileName) {
      throw new BadRequestError('Folder and file name are required');
    }
    const objectName = `${folder}/${fileName}`;
    try {
      const data = await storageService.getFile(objectName);
      
      // Determine content type
      let contentType = 'application/octet-stream';
      const ext = fileName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (ext.endsWith('.png')) {
        contentType = 'image/png';
      } else if (ext.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (ext.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (ext.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (ext.endsWith('.pdf')) {
        contentType = 'application/pdf';
      }
      
      c.header('Content-Type', contentType);
      c.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      return c.body(data as any);
    } catch (err) {
      logger.error('Failed to get public file', { objectName, error: (err as Error).message });
      return c.json({ success: false, message: 'File not found' }, 404);
    }
  });

  app.get('/public/:fileName', async (c: Context) => {
    const fileName = c.req.param('fileName');
    if (!fileName) {
      throw new BadRequestError('File name is required');
    }
    try {
      const data = await storageService.getFile(fileName);
      
      // Determine content type
      let contentType = 'application/octet-stream';
      const ext = fileName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (ext.endsWith('.png')) {
        contentType = 'image/png';
      } else if (ext.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (ext.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (ext.endsWith('.webp')) {
        contentType = 'image/webp';
      }
      
      c.header('Content-Type', contentType);
      c.header('Cache-Control', 'public, max-age=31536000');
      return c.body(data as any);
    } catch (err) {
      logger.error('Failed to get public file', { fileName, error: (err as Error).message });
      return c.json({ success: false, message: 'File not found' }, 404);
    }
  });

  app.post('/upload', authMiddleware, requirePermission(PERMISSIONS.STORAGE_UPLOAD), async (c: Context) => {
    const formData = await c.req.parseBody({ all: true });

    const maybeFile = formData.file;
    if (!maybeFile || typeof (maybeFile as File).arrayBuffer !== 'function') {
      throw new BadRequestError('File is required');
    }
    const file = maybeFile as File;

    validateUploadFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = formData.folder as string | undefined;

    const result = await storageService.uploadFile(buffer, file.name, file.type, folder);
    return c.json({ success: true, data: result });
  });

  app.get('/:objectName', authMiddleware, requirePermission(PERMISSIONS.STORAGE_READ), async (c: Context) => {
    const objectName = c.req.param('objectName');
    if (!objectName) {
      throw new BadRequestError('Object name is required');
    }
    const expires = Number(c.req.query('expires') || 3600);

    const url = await storageService.getSignedUrl(objectName, expires);
    return c.json({ success: true, data: { url } });
  });

  app.delete('/:objectName', authMiddleware, requirePermission(PERMISSIONS.STORAGE_DELETE), async (c: Context) => {
    const objectName = c.req.param('objectName');
    if (!objectName) {
      throw new BadRequestError('Object name is required');
    }
    await storageService.deleteFile(objectName);
    return c.json({ success: true });
  });

  return app;
}