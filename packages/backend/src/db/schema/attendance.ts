import { pgTable, varchar, timestamp, text, pgEnum, index } from 'drizzle-orm/pg-core';

// Full-day attendance is recorded by the class teacher; period attendance is
// recorded per-subject by the subject teacher. A single table serves both,
// discriminated by `type`. For 'period' rows, `subject` / `period` are set;
// for 'full_day' rows they are null.
export const attendanceTypeEnum = pgEnum('attendance_type', ['period', 'full_day']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late', 'excused']);

export const attendance = pgTable(
  'attendance',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    type: attendanceTypeEnum('attendance_type').notNull(),
    studentId: varchar('student_id', { length: 36 }).notNull(),
    class: varchar('class', { length: 50 }).notNull(),
    // Only populated for period-level rows.
    subject: varchar('subject', { length: 100 }),
    period: varchar('period', { length: 20 }),
    status: attendanceStatusEnum('attendance_status').notNull().default('present'),
    // Calendar day the attendance is for, as YYYY-MM-DD (matches the string-date
    // convention used elsewhere, e.g. results.date).
    date: varchar('date', { length: 20 }).notNull(),
    term: varchar('term', { length: 20 }),
    session: varchar('session', { length: 20 }),
    remarks: varchar('remarks', { length: 255 }),
    recordedBy: varchar('recorded_by', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    studentDateIdx: index('attendance_student_date_idx').on(table.studentId, table.date),
    classDateIdx: index('attendance_class_date_idx').on(table.class, table.date),
  })
);

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
