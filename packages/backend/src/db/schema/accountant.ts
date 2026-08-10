import { pgTable, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const bills = pgTable('bills', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  studentName: varchar('student_name', { length: 255 }),
  class: varchar('class', { length: 20 }),
  amount: integer('amount').notNull(),
  description: varchar('description', { length: 255 }),
  dueDate: timestamp('due_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;

export const payments = pgTable('payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  billId: varchar('bill_id', { length: 36 }),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  studentName: varchar('student_name', { length: 255 }),
  class: varchar('class', { length: 20 }),
  amount: integer('amount').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  status: varchar('status', { length: 20 }).default('completed'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export const accountSettings = pgTable('account_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  feeAmount: integer('fee_amount').default(50000),
  threshold30: integer('threshold_30').default(15000),
  threshold70: integer('threshold_70').default(35000),
  schoolEmail: varchar('school_email', { length: 255 }),
  emailSubject: varchar('email_subject', { length: 255 }),
  accountNumber: varchar('account_number', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AccountSettings = typeof accountSettings.$inferSelect;
export type NewAccountSettings = typeof accountSettings.$inferInsert;