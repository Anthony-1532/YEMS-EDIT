import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
  class: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  dueDate: z.string().optional(),
  availableFrom: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  class: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  dueDate: z.string().optional(),
  availableFrom: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;