import { pgTable, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'draft', 'archived']);
export const dueClassEnum = pgEnum('due_class', ['due-today', 'due-days', 'overdue']);

export const assignments = pgTable('assignments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  desc: text('description'),
  subject: varchar('subject', { length: 100 }),
  class: varchar('class', { length: 50 }),
  status: statusEnum('status').default('active'),
  dueDate: timestamp('due_date'),
  availableFrom: timestamp('available_from'),
  dueLabel: varchar('due_label', { length: 50 }),
  dueClass: dueClassEnum('due_class'),
  est: varchar('est', { length: 20 }),
  icon: varchar('icon', { length: 10 }),
  iconColor: varchar('icon_color', { length: 20 }),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;