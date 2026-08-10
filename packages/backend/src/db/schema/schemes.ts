import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const schemes = pgTable('schemes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  subject: varchar('subject', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  week: varchar('week', { length: 10 }),
  term: varchar('term', { length: 20 }),
  class: varchar('class', { length: 20 }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Scheme = typeof schemes.$inferSelect;
export type NewScheme = typeof schemes.$inferInsert;