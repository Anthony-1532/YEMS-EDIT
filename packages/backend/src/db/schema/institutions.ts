import { pgTable, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const institutions = pgTable('institutions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  contactEmail: varchar('contact_email', { length: 255 }),
  status: varchar('status', { length: 20 }).default('active'),
  students: integer('students').default(0),
  teachers: integer('teachers').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;
