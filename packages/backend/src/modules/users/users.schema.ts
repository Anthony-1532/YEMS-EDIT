import { z } from 'zod';
import { passwordPolicySchema } from '../../shared/validators/password.validator.js';

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordPolicySchema,
  role: z.enum(['student', 'teacher', 'admin', 'superadmin', 'accountant', 'technician', 'principal', 'hod', 'parent']).optional(),
  // Optional profile fields
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
  adminId: z.string().optional(),
  accountantId: z.string().optional(),
  class: z.string().optional(),
  session: z.string().optional(),
  term: z.string().optional(),
  sex: z.string().optional(),
  admissionNo: z.string().optional(),
  assignedSubjects: z.array(z.string()).optional(),
  assignedClasses: z.array(z.string()).optional(),
  isClassTeacher: z.boolean().optional(),
  classTeacherOf: z.string().optional(),
  initials: z.string().optional(),
  profilePicture: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: passwordPolicySchema.optional(),
  // Additional updatable fields
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
  class: z.string().optional(),
  session: z.string().optional(),
  term: z.string().optional(),
  sex: z.string().optional(),
  admissionNo: z.string().optional(),
  assignedSubjects: z.array(z.string()).optional(),
  assignedClasses: z.array(z.string()).optional(),
  isClassTeacher: z.boolean().optional(),
  classTeacherOf: z.string().optional(),
  initials: z.string().optional(),
  profilePicture: z.string().optional(),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;