import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const subjects = pgTable('subjects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).unique(),
  description: text('description'),
  category: varchar('category', { length: 20 }).notNull(),
  department: varchar('department', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
