import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const lessonPlans = pgTable('lesson_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  subject: varchar('subject', { length: 100 }).notNull(),
  topic: varchar('topic', { length: 255 }).notNull(),
  week: varchar('week', { length: 10 }),
  term: varchar('term', { length: 20 }),
  class: varchar('class', { length: 20 }),
  objectives: text('objectives'),
  materials: text('materials'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type NewLessonPlan = typeof lessonPlans.$inferInsert;