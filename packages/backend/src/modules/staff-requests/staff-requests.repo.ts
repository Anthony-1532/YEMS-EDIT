import { db } from '../../config/db.js';
import { staffRequests } from '../../db/schema/staff-requests.js';
import { eq, and, desc } from 'drizzle-orm';
import type { StaffRequest, NewStaffRequest } from '../../db/schema/staff-requests.js';

export interface StaffRequestFilters {
  staffId?: string;
  type?: string;
  status?: string;
  term?: string;
  session?: string;
  limit?: number;
  offset?: number;
}

export async function findAllRequests(filters?: StaffRequestFilters): Promise<StaffRequest[]> {
  const conditions = [];

  if (filters?.staffId) conditions.push(eq(staffRequests.staffId, filters.staffId));
  if (filters?.type) conditions.push(eq(staffRequests.type, filters.type as any));
  if (filters?.status) conditions.push(eq(staffRequests.status, filters.status as any));
  if (filters?.term) conditions.push(eq(staffRequests.term, filters.term));
  if (filters?.session) conditions.push(eq(staffRequests.session, filters.session));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(staffRequests)
    .where(where)
    .orderBy(desc(staffRequests.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function findRequestById(id: string): Promise<StaffRequest | undefined> {
  const result = await db.select().from(staffRequests).where(eq(staffRequests.id, id)).limit(1);
  return result[0];
}

export async function createRequest(data: NewStaffRequest): Promise<StaffRequest> {
  const [row] = await db.insert(staffRequests).values(data).returning();
  return row;
}

export async function updateRequest(
  id: string,
  data: Partial<NewStaffRequest>
): Promise<StaffRequest | undefined> {
  const [row] = await db
    .update(staffRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(staffRequests.id, id))
    .returning();
  return row;
}

export async function deleteRequest(id: string): Promise<void> {
  await db.delete(staffRequests).where(eq(staffRequests.id, id));
}
