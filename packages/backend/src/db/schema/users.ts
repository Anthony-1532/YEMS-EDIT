import { pgTable, timestamp, varchar, boolean, pgEnum, text, integer } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', [
  'student',
  'teacher',
  'admin',
  'superadmin',
  'accountant',
  'technician',
  'principal',
  'hod',
  'parent',
]);

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  initials: varchar('initials', { length: 10 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('student'),
  studentId: varchar('student_id', { length: 50 }),
  teacherId: varchar('teacher_id', { length: 50 }),
  adminId: varchar('admin_id', { length: 50 }),
  accountantId: varchar('accountant_id', { length: 50 }),
  class: varchar('class', { length: 50 }),
  session: varchar('session', { length: 20 }).default('2024/2025'),
  term: varchar('term', { length: 20 }).default('Second Term'),
  sex: varchar('sex', { length: 10 }),
  admissionNo: varchar('admission_no', { length: 50 }),
  assignedSubjects: text('assigned_subjects').$type<string[]>(),
  assignedClasses: text('assigned_classes').$type<string[]>(),
  isClassTeacher: boolean('is_class_teacher').default(false),
  classTeacherOf: varchar('class_teacher_of', { length: 20 }),
  emailVerified: boolean('email_verified').default(false),
  isSuspended: boolean('is_suspended').default(false),
  profilePicture: text('profile_picture'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;