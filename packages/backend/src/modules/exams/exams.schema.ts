import { z } from 'zod';

const questionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z.array(z.string()).optional(),
  points: z.number().optional(),
  correctIndex: z.number().optional(),
}).passthrough();

export const createExamSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['quiz', 'midterm', 'final', 'practice']),
  description: z.string().optional(),
  questions: z.array(questionSchema).optional(),
  questionsList: z.array(questionSchema).optional(),
  questionsCount: z.number().min(0).optional(),
  class: z.string().min(1, 'Class level is required'),
  subject: z.string().optional(),
  format: z.enum(['mcq', 'theory', 'both']).optional(),
  status: z.enum(['not-started', 'upcoming', 'active', 'completed']).optional(),
  showResults: z.boolean().optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  availableFrom: z.union([z.string(), z.date()]).optional(),
  duration: z.number().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
});

export const updateExamSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['quiz', 'midterm', 'final', 'practice']).optional(),
  description: z.string().optional(),
  questions: z.array(questionSchema).optional(),
  questionsList: z.array(questionSchema).optional(),
  questionsCount: z.number().min(0).optional(),
  class: z.string().optional(),
  subject: z.string().optional(),
  format: z.enum(['mcq', 'theory', 'both']).optional(),
  duration: z.number().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  status: z.enum(['not-started', 'upcoming', 'active', 'completed']).optional(),
  showResults: z.boolean().optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  availableFrom: z.union([z.string(), z.date()]).optional(),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
});

export const submitExamSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
