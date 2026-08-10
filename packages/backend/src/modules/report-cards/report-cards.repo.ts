import { db } from '../../config/db.js';
import { reportCards } from '../../db/schema/report-cards.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { ReportCard, NewReportCard } from '../../db/schema/report-cards.js';

export interface ReportCardFilters {
  studentId?: string;
  class?: string;
  term?: string;
  session?: string;
  status?: ReportCard['status'];
  compiledBy?: string;
  limit?: number;
  offset?: number;
  // Teacher scoping: restrict results to these classes.
  classes?: string[];
  // Status set filter (e.g. parent-visible = ['sent']).
  statuses?: ReportCard['status'][];
}

export async function findAllReportCards(filters?: ReportCardFilters): Promise<ReportCard[]> {
  const conditions = [];

  if (filters?.studentId) conditions.push(eq(reportCards.studentId, filters.studentId));
  if (filters?.class) conditions.push(eq(reportCards.class, filters.class));
  if (filters?.term) conditions.push(eq(reportCards.term, filters.term));
  if (filters?.session) conditions.push(eq(reportCards.session, filters.session));
  if (filters?.status) conditions.push(eq(reportCards.status, filters.status));
  if (filters?.compiledBy) conditions.push(eq(reportCards.compiledBy, filters.compiledBy));
  if (filters?.classes && filters.classes.length > 0) {
    conditions.push(inArray(reportCards.class, filters.classes));
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    conditions.push(inArray(reportCards.status, filters.statuses));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(reportCards)
    .where(where)
    .orderBy(desc(reportCards.updatedAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function findReportCardById(id: string): Promise<ReportCard | undefined> {
  const result = await db.select().from(reportCards).where(eq(reportCards.id, id)).limit(1);
  return result[0];
}

export async function createReportCard(data: NewReportCard): Promise<ReportCard> {
  const [record] = await db.insert(reportCards).values(data).returning();
  return record;
}

export async function updateReportCard(
  id: string,
  data: Partial<NewReportCard>
): Promise<ReportCard | undefined> {
  const [record] = await db
    .update(reportCards)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(reportCards.id, id))
    .returning();
  return record;
}

export async function deleteReportCard(id: string): Promise<void> {
  await db.delete(reportCards).where(eq(reportCards.id, id));
}
