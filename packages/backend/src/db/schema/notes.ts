import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const notes = pgTable('notes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  subject: varchar('subject', { length: 100 }),
  subjectId: varchar('subject_id', { length: 36 }),
  class: varchar('class', { length: 50 }),
  week: varchar('week', { length: 10 }),
  term: varchar('term', { length: 20 }),
  date: varchar('date', { length: 20 }),
  availableFrom: timestamp('available_from'),
  icon: varchar('icon', { length: 10 }),
  iconColor: varchar('icon_color', { length: 20 }),
  fileData: text('file_data'),
  fileName: varchar('file_name', { length: 100 }),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;