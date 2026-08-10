import { pgTable, varchar, timestamp, text, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const reportCategoryEnum = pgEnum('report_category', ['feedback', 'bug', 'suggestion', 'complaint', 'emergency']);

export const reports = pgTable('reports', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  category: reportCategoryEnum('report_category').notNull(),
  description: text('description').notNull(),
  read: boolean('read').default(false),
  status: varchar('status', { length: 20 }).default('pending'),
  date: varchar('date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;