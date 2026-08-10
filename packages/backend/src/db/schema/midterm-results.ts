import { pgTable, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

export const midtermResults = pgTable('midterm_results', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  studentName: varchar('student_name', { length: 255 }),
  class: varchar('class', { length: 20 }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  caScore: integer('ca_score'),
  examScore: integer('exam_score'),
  totalScore: integer('total_score'),
  grade: varchar('grade', { length: 5 }),
  term: varchar('term', { length: 20 }),
  session: varchar('session', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type MidtermResult = typeof midtermResults.$inferSelect;
export type NewMidtermResult = typeof midtermResults.$inferInsert;