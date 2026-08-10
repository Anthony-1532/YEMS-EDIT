import { pgTable, varchar, timestamp, text, integer, pgEnum, index } from 'drizzle-orm/pg-core';

// `waitlisted` sits between pending and a final approve/reject: the applicant
// is queued (with a rank) for a place if one frees up.
export const admissionStatusEnum = pgEnum('admission_status', ['pending', 'approved', 'rejected', 'waitlisted']);

export const admissions = pgTable('admissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: varchar('date_of_birth', { length: 20 }),
  gender: varchar('gender', { length: 10 }),
  class: varchar('class', { length: 20 }),
  parentName: varchar('parent_name', { length: 255 }),
  parentPhone: varchar('parent_phone', { length: 20 }),
  status: admissionStatusEnum('admission_status').default('pending'),
  // Entrance assessment / merit score used to order the waitlist.
  score: integer('score'),
  // 1-based position in the waitlist queue (1 = next in line). Null unless waitlisted.
  waitlistRank: integer('waitlist_rank'),
  // Final-decision audit trail (approve / reject / waitlist / promote).
  decidedBy: varchar('decided_by', { length: 36 }),
  decidedAt: timestamp('decided_at'),
  decisionReason: text('decision_reason'),
  session: varchar('session', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('admissions_status_idx').on(table.status),
  waitlistRankIdx: index('admissions_waitlist_rank_idx').on(table.waitlistRank),
}));

export type Admission = typeof admissions.$inferSelect;
export type NewAdmission = typeof admissions.$inferInsert;