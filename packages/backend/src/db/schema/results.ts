import { pgTable, varchar, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';

export const results = pgTable('results', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  examId: varchar('exam_id', { length: 36 }),
  subject: varchar('subject', { length: 100 }).notNull(),
  score: integer('score').notNull(),
  totalScore: integer('total_score').notNull(),
  grade: varchar('grade', { length: 5 }),
  remarks: varchar('remarks', { length: 255 }),
  class: varchar('class', { length: 20 }),
  session: varchar('session', { length: 20 }),
  term: varchar('term', { length: 20 }),
  examTitle: varchar('exam_title', { length: 255 }),
  date: varchar('date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;