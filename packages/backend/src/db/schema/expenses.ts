import { pgTable, varchar, timestamp, text, integer, pgEnum, index } from 'drizzle-orm/pg-core';

// School expenditure recorded by the accountant. Anything at or above the
// approval threshold is held `pending` for the principal to sign off.
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'approved', 'rejected']);

export const expenses = pgTable('expenses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  category: varchar('category', { length: 80 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  amount: integer('amount').notNull(),
  vendor: varchar('vendor', { length: 150 }),
  expenseDate: varchar('expense_date', { length: 20 }).notNull(),
  status: expenseStatusEnum('status').notNull().default('pending'),
  // Whether this expense required principal sign-off (amount >= threshold at
  // time of recording). Sub-threshold expenses are auto-approved.
  requiresApproval: integer('requires_approval').notNull().default(1),
  recordedBy: varchar('recorded_by', { length: 36 }).notNull(),
  recordedByName: varchar('recorded_by_name', { length: 150 }),
  decidedBy: varchar('decided_by', { length: 36 }),
  decidedAt: timestamp('decided_at'),
  decisionReason: text('decision_reason'),
  term: varchar('term', { length: 20 }),
  session: varchar('session', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('expenses_status_idx').on(table.status),
  categoryIdx: index('expenses_category_idx').on(table.category),
  dateIdx: index('expenses_date_idx').on(table.expenseDate),
}));

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
