import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  subject: z.string().optional(),
  subjectId: z.string().optional(),
  class: z.string().optional(),
  week: z.string().optional(),
  term: z.string().optional(),
  date: z.string().optional(),
  availableFrom: z.string().optional(),
  fileData: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  subject: z.string().optional(),
  subjectId: z.string().optional(),
  class: z.string().optional(),
  week: z.string().optional(),
  term: z.string().optional(),
  date: z.string().optional(),
  availableFrom: z.string().optional(),
  fileData: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;