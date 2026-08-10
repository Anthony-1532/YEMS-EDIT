import { pgTable, varchar, timestamp, text, integer, pgEnum, index } from 'drizzle-orm/pg-core';

export const staffRequestTypeEnum = pgEnum('staff_request_type', ['leave', 'resource', 'facility', 'other']);
export const staffRequestStatusEnum = pgEnum('staff_request_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const staffRequestPriorityEnum = pgEnum('staff_request_priority', ['low', 'normal', 'high']);

export const staffRequests = pgTable('staff_requests', {
  id: varchar('id', { length: 36 }).primaryKey(),
  staffId: varchar('staff_id', { length: 36 }).notNull(),
  staffName: varchar('staff_name', { length: 150 }),
  staffRole: varchar('staff_role', { length: 30 }),
  type: staffRequestTypeEnum('type').notNull().default('other'),
  title: varchar('title', { length: 200 }).notNull(),
  details: text('details'),
  priority: staffRequestPriorityEnum('priority').notNull().default('normal'),
  startDate: varchar('start_date', { length: 20 }),
  endDate: varchar('end_date', { length: 20 }),
  amount: integer('amount'),
  status: staffRequestStatusEnum('status').notNull().default('pending'),
  decidedBy: varchar('decided_by', { length: 36 }),
  decidedAt: timestamp('decided_at'),
  decisionReason: text('decision_reason'),
  term: varchar('term', { length: 20 }),
  session: varchar('session', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  staffIdx: index('staff_requests_staff_idx').on(table.staffId),
  statusIdx: index('staff_requests_status_idx').on(table.status),
  typeStatusIdx: index('staff_requests_type_status_idx').on(table.type, table.status),
}));

export type StaffRequest = typeof staffRequests.$inferSelect;
export type NewStaffRequest = typeof staffRequests.$inferInsert;
