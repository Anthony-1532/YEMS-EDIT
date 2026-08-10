import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const lessons = pgTable('lessons', {
  id: varchar('id', { length: 36 }).primaryKey(),
  subject: varchar('subject', { length: 100 }).notNull(),
  topic: varchar('topic', { length: 255 }).notNull(),
  time: varchar('time', { length: 50 }),
  isLive: boolean('is_live').default(false),
  icon: varchar('icon', { length: 10 }),
  iconBg: varchar('icon_bg', { length: 20 }),
  iconColor: varchar('icon_color', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;