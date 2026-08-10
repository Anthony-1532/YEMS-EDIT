import { pgTable, varchar, timestamp, text, pgEnum, index } from 'drizzle-orm/pg-core';

// Severity drives auto-escalation: `serious` and `severe` surface to the
// principal automatically; `minor`/`moderate` stay with the class teacher
// unless manually escalated.
export const disciplineSeverityEnum = pgEnum('discipline_severity', ['minor', 'moderate', 'serious', 'severe']);

// Escalation workflow: open -> escalated -> resolved (or dismissed).
export const disciplineStatusEnum = pgEnum('discipline_status', ['open', 'escalated', 'resolved', 'dismissed']);

// Final decision recorded by the principal when resolving.
export const disciplineActionEnum = pgEnum('discipline_action', [
  'none',
  'warning',
  'detention',
  'parent_meeting',
  'suspension',
  'expulsion',
  'counseling',
]);

export const disciplineIncidents = pgTable('discipline_incidents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).notNull(),
  studentName: varchar('student_name', { length: 150 }),
  class: varchar('class', { length: 50 }).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  severity: disciplineSeverityEnum('severity').notNull().default('minor'),
  description: text('description').notNull(),
  incidentDate: varchar('incident_date', { length: 20 }).notNull(),
  status: disciplineStatusEnum('status').notNull().default('open'),
  reportedBy: varchar('reported_by', { length: 36 }).notNull(),
  reporterName: varchar('reporter_name', { length: 150 }),
  escalatedBy: varchar('escalated_by', { length: 36 }),
  escalatedAt: timestamp('escalated_at'),
  action: disciplineActionEnum('action').notNull().default('none'),
  actionDetail: text('action_detail'),
  resolutionNote: text('resolution_note'),
  resolvedBy: varchar('resolved_by', { length: 36 }),
  resolvedAt: timestamp('resolved_at'),
  term: varchar('term', { length: 20 }),
  session: varchar('session', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  classStatusIdx: index('discipline_class_status_idx').on(table.class, table.status),
  statusIdx: index('discipline_status_idx').on(table.status),
  studentIdx: index('discipline_student_idx').on(table.studentId),
  severityIdx: index('discipline_severity_idx').on(table.severity),
}));

export type DisciplineIncident = typeof disciplineIncidents.$inferSelect;
export type NewDisciplineIncident = typeof disciplineIncidents.$inferInsert;
