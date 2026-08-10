import { pgTable, varchar, text, timestamp, jsonb, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';

export const examTypeEnum = pgEnum('exam_type', ['quiz', 'midterm', 'final', 'practice']);
export const examFormatEnum = pgEnum('exam_format', ['mcq', 'theory', 'both']);
export const examStatusEnum = pgEnum('exam_status', ['not-started', 'upcoming', 'active', 'completed']);

export const exams = pgTable('exams', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  desc: text('description'),
  type: examTypeEnum('exam_type').notNull(),
  format: examFormatEnum('exam_format').default('mcq'),
  questions: jsonb('questions').$type<
    Array<{
      id: string;
      text: string;
      options?: string[];
      points?: number;
      correctIndex?: number;
    }>
  >(),
  duration: integer('duration'),
  passingScore: integer('passing_score'),
  subject: varchar('subject', { length: 100 }),
  class: varchar('class', { length: 50 }),
  status: examStatusEnum('exam_status').default('not-started'),
  showResults: boolean('show_results').default(false).notNull(),
  questionsCount: integer('questions_count'),
  questionsList: jsonb('questions_list').$type<
    Array<{
      id?: string;
      text: string;
      marks?: number;
      type?: string;
      options?: string[];
      correct?: number;
      correctIndex?: number;
      image?: string;
    }>
  >(),
  icon: varchar('icon', { length: 10 }),
  bg: varchar('bg', { length: 20 }),
  iconColor: varchar('icon_color', { length: 20 }),
  startTime: timestamp('start_time'),
  availableFrom: timestamp('available_from'),
  fileData: text('file_data'),
  fileName: varchar('file_name', { length: 255 }),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;