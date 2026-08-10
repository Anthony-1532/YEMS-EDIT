import { pgTable, varchar, timestamp, boolean, text, pgEnum } from 'drizzle-orm/pg-core';

export const notifTypeEnum = pgEnum('notif_type', ['note', 'exam', 'assignment', 'result', 'system']);

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  type: notifTypeEnum('notif_type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  noteId: varchar('note_id', { length: 36 }),
  examId: varchar('exam_id', { length: 36 }),
  assignmentId: varchar('assignment_id', { length: 36 }),
  fromUserId: varchar('from_user_id', { length: 36 }),
  toUserId: varchar('to_user_id', { length: 36 }),
  read: boolean('read').default(false),
  date: varchar('date', { length: 20 }),
  timestamp: timestamp('timestamp'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;