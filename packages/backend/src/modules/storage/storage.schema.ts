import { z } from 'zod';

export const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().optional(),
  folder: z.string().optional(),
});

export const signedUrlSchema = z.object({
  objectName: z.string().min(1),
  expires: z.number().min(1).max(86400).optional(),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type SignedUrlInput = z.infer<typeof signedUrlSchema>;