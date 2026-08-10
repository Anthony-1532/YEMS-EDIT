import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const classes = pgTable('classes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  level: varchar('level', { length: 20 }).notNull(),
  stream: varchar('stream', { length: 20 }).notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
