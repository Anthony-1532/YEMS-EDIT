import { db } from '../../config/db.js';
import { disciplineIncidents } from '../../db/schema/discipline.js';
import { eq, and, desc, inArray, gte, lte } from 'drizzle-orm';
import type { DisciplineIncident, NewDisciplineIncident } from '../../db/schema/discipline.js';

export interface DisciplineFilters {
  studentId?: string;
  class?: string;
  severity?: string;
  status?: string;
  reportedBy?: string;
  fromDate?: string;
  toDate?: string;
  term?: string;
  session?: string;
  limit?: number;
  offset?: number;
  // Teacher scoping: restrict results to these classes.
  classes?: string[];
  statuses?: string[];
}

export async function findAllIncidents(filters?: DisciplineFilters): Promise<DisciplineIncident[]> {
  const conditions = [];

  if (filters?.studentId) conditions.push(eq(disciplineIncidents.studentId, filters.studentId));
  if (filters?.class) conditions.push(eq(disciplineIncidents.class, filters.class));
  if (filters?.severity) conditions.push(eq(disciplineIncidents.severity, filters.severity as any));
  if (filters?.status) conditions.push(eq(disciplineIncidents.status, filters.status as any));
  if (filters?.reportedBy) conditions.push(eq(disciplineIncidents.reportedBy, filters.reportedBy));
  if (filters?.fromDate) conditions.push(gte(disciplineIncidents.incidentDate, filters.fromDate));
  if (filters?.toDate) conditions.push(lte(disciplineIncidents.incidentDate, filters.toDate));
  if (filters?.term) conditions.push(eq(disciplineIncidents.term, filters.term));
  if (filters?.session) conditions.push(eq(disciplineIncidents.session, filters.session));
  if (filters?.classes && filters.classes.length > 0) {
    conditions.push(inArray(disciplineIncidents.class, filters.classes));
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    conditions.push(inArray(disciplineIncidents.status, filters.statuses as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(disciplineIncidents)
    .where(where)
    .orderBy(desc(disciplineIncidents.incidentDate), desc(disciplineIncidents.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function findIncidentById(id: string): Promise<DisciplineIncident | undefined> {
  const result = await db.select().from(disciplineIncidents).where(eq(disciplineIncidents.id, id)).limit(1);
  return result[0];
}

export async function createIncident(data: NewDisciplineIncident): Promise<DisciplineIncident> {
  const [row] = await db.insert(disciplineIncidents).values(data).returning();
  return row;
}

export async function updateIncident(
  id: string,
  data: Partial<NewDisciplineIncident>
): Promise<DisciplineIncident | undefined> {
  const [row] = await db
    .update(disciplineIncidents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(disciplineIncidents.id, id))
    .returning();
  return row;
}

export async function deleteIncident(id: string): Promise<void> {
  await db.delete(disciplineIncidents).where(eq(disciplineIncidents.id, id));
}
