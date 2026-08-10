import { pgTable, varchar, timestamp, text, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const submissions = pgTable(
  'submissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    examId: varchar('exam_id', { length: 36 }).notNull(),
    studentId: varchar('student_id', { length: 36 }).notNull(),
    answers: jsonb('answers').$type<Record<string, any>>(),
    score: integer('score'),
    totalScore: integer('total_score'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    gradedBy: varchar('graded_by', { length: 36 }),
    gradedAt: timestamp('graded_at'),
    feedback: text('feedback'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubmissionPerExamAndStudent: uniqueIndex('submissions_exam_student_unique').on(table.examId, table.studentId),
  })
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;