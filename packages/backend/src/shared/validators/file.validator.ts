import path from 'path';
import { env } from '../../config/env.js';
import { BadRequestError } from '../errors/app-error.js';

const allowedMimeTypes = env.UPLOAD_ALLOWED_MIME_TYPES.split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const extensionWhitelistByMime: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export function validateUploadFile(file: File): void {
  if (!file.name) {
    throw new BadRequestError('Uploaded file name is required');
  }

  if (file.size <= 0) {
    throw new BadRequestError('Uploaded file is empty');
  }

  if (file.size > env.UPLOAD_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(`File exceeds maximum allowed size of ${env.UPLOAD_MAX_FILE_SIZE_BYTES} bytes`);
  }

  const mimeType = (file.type || '').toLowerCase().trim();
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestError(`Unsupported file type: ${file.type || 'unknown'}`);
  }

  const extension = path.extname(file.name).toLowerCase();
  const allowedExtensions = extensionWhitelistByMime[mimeType] || [];
  if (!allowedExtensions.includes(extension)) {
    throw new BadRequestError(`File extension ${extension || '(none)'} does not match MIME type ${mimeType}`);
  }
}
