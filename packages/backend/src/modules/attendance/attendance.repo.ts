import { db } from '../../config/db.js';
import { attendance } from '../../db/schema/attendance.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { Attendance, NewAttendance } from '../../db/schema/attendance.js';

export interface AttendanceFilters {
  type?: 'period' | 'full_day';
  class?: string;
  subject?: string;
  studentId?: string;
  date?: string;
  term?: string;
  session?: string;
  limit?: number;
  offset?: number;
  // Teacher scoping: restrict results to these classes.
  classes?: string[];
}

export async function findAllAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
  const conditions = [];

  if (filters?.type) conditions.push(eq(attendance.type, filters.type));
  if (filters?.class) conditions.push(eq(attendance.class, filters.class));
  if (filters?.subject) conditions.push(eq(attendance.subject, filters.subject));
  if (filters?.studentId) conditions.push(eq(attendance.studentId, filters.studentId));
  if (filters?.date) conditions.push(eq(attendance.date, filters.date));
  if (filters?.term) conditions.push(eq(attendance.term, filters.term));
  if (filters?.session) conditions.push(eq(attendance.session, filters.session));
  if (filters?.classes && filters.classes.length > 0) {
    conditions.push(inArray(attendance.class, filters.classes));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(attendance)
    .where(where)
    .orderBy(desc(attendance.date), desc(attendance.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function findAttendanceById(id: string): Promise<Attendance | undefined> {
  const result = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  return result[0];
}

export async function createAttendance(data: NewAttendance): Promise<Attendance> {
  const [record] = await db.insert(attendance).values(data).returning();
  return record;
}

export async function createManyAttendance(data: NewAttendance[]): Promise<Attendance[]> {
  if (data.length === 0) return [];
  return db.insert(attendance).values(data).returning();
}

export async function updateAttendance(
  id: string,
  data: Partial<Pick<Attendance, 'status' | 'remarks' | 'period' | 'subject'>>
): Promise<Attendance | undefined> {
  const [record] = await db
    .update(attendance)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(attendance.id, id))
    .returning();
  return record;
}

export async function deleteAttendance(id: string): Promise<void> {
  await db.delete(attendance).where(eq(attendance.id, id));
}
