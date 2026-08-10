import { db } from '../../config/db.js';
import { reports } from '../../db/schema/reports.js';
import { eq, and, desc } from 'drizzle-orm';
import type { Report, NewReport } from '../../db/schema/reports.js';

export interface ReportFilters {
  userId?: string;
  read?: boolean;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function findAllReports(filters?: ReportFilters): Promise<Report[]> {
  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(reports.userId, filters.userId));
  }

  if (filters?.read !== undefined) {
    conditions.push(eq(reports.read, filters.read));
  }

  if (filters?.status) {
    conditions.push(eq(reports.status, filters.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(reports)
    .where(where)
    .orderBy(desc(reports.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findUnreadReports(): Promise<Report[]> {
  return db.select().from(reports).where(eq(reports.read, false)).orderBy(desc(reports.createdAt));
}

export async function findReportsByUserId(userId: string): Promise<Report[]> {
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function findReportById(id: string): Promise<Report | undefined> {
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result[0];
}

export async function createReport(data: {
  id: string;
  userId: string;
  userName?: string;
  category: Report['category'];
  description: string;
  date?: string;
}): Promise<Report> {
  const [report] = await db.insert(reports).values({
    id: data.id,
    userId: data.userId,
    userName: data.userName,
    category: data.category,
    description: data.description,
    read: false,
    status: 'pending',
    date: data.date || new Date().toLocaleDateString('en-GB'),
  }).returning();
  return report;
}

export async function markAsRead(id: string): Promise<Report | undefined> {
  const [report] = await db
    .update(reports)
    .set({ read: true })
    .where(eq(reports.id, id))
    .returning();
  return report;
}

export async function updateStatus(id: string, status: string): Promise<Report | undefined> {
  const [report] = await db
    .update(reports)
    .set({ status })
    .where(eq(reports.id, id))
    .returning();
  return report;
}

export async function resolveReport(id: string): Promise<Report | undefined> {
  const [report] = await db
    .update(reports)
    .set({ status: 'resolved' })
    .where(eq(reports.id, id))
    .returning();
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  await db.delete(reports).where(eq(reports.id, id));
}