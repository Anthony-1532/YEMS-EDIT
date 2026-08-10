import { pgTable, varchar, timestamp, text, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';

// Approval gate: a class teacher compiles a draft, submits it, and the principal
// either approves (which makes it sendable to the parent) or returns it with
// comments for revision. `sent` is the terminal, parent-visible state.
export const reportCardStatusEnum = pgEnum('report_card_status', [
  'draft',
  'submitted',
  'principal_approved',
  'returned',
  'sent',
]);

export interface ReportCardSubjectRow {
  subject: string;
  caScore?: number;
  examScore?: number;
  totalScore?: number;
  grade?: string;
  remark?: string;
}

export const reportCards = pgTable('report_cards', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  studentName: varchar('student_name', { length: 150 }),
  class: varchar('class', { length: 50 }).notNull(),
  term: varchar('term', { length: 20 }).notNull(),
  session: varchar('session', { length: 20 }).notNull(),
  status: reportCardStatusEnum('report_card_status').notNull().default('draft'),
  // Compiled per-subject scores; shape is ReportCardSubjectRow[].
  subjects: jsonb('subjects').$type<ReportCardSubjectRow[]>().notNull().default([]),
  overallTotal: integer('overall_total'),
  overallAverage: integer('overall_average'),
  position: varchar('position', { length: 20 }),
  attendanceSummary: varchar('attendance_summary', { length: 100 }),
  classTeacherRemark: text('class_teacher_remark'),
  principalComment: text('principal_comment'),
  compiledBy: varchar('compiled_by', { length: 36 }).notNull(),
  submittedAt: timestamp('submitted_at'),
  reviewedBy: varchar('reviewed_by', { length: 36 }),
  reviewedAt: timestamp('reviewed_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  studentTermIdx: index('report_cards_student_term_idx').on(table.studentId, table.term, table.session),
  classStatusIdx: index('report_cards_class_status_idx').on(table.class, table.status),
  statusIdx: index('report_cards_status_idx').on(table.status),
}));

export type ReportCard = typeof reportCards.$inferSelect;
export type NewReportCard = typeof reportCards.$inferInsert;
