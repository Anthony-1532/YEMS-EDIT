import { db } from '../../config/db.js';
import { admissions } from '../../db/schema/admissions.js';
import { eq, ilike, and, asc, desc } from 'drizzle-orm';
import type { Admission, NewAdmission } from '../../db/schema/admissions.js';

export interface AdmissionFilters {
  search?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  limit?: number;
  offset?: number;
}

export interface DecisionPatch {
  decidedBy?: string | null;
  decisionReason?: string | null;
}

export async function findAllAdmissions(filters?: AdmissionFilters): Promise<Admission[]> {
  const conditions = [];

  if (filters?.search) {
    conditions.push(
      ilike(admissions.firstName, `%${filters.search}%`),
      ilike(admissions.lastName, `%${filters.search}%`),
      ilike(admissions.email, `%${filters.search}%`)
    );
  }

  if (filters?.status) {
    conditions.push(eq(admissions.status, filters.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(admissions)
    .where(where)
    .orderBy(desc(admissions.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findAdmissionsByUserId(userId: string): Promise<Admission[]> {
  return db.select().from(admissions).where(eq(admissions.id, userId)).orderBy(desc(admissions.createdAt));
}

export async function findPendingAdmissions(): Promise<Admission[]> {
  return db.select().from(admissions).where(eq(admissions.status, 'pending'));
}

// Waitlist ordered by explicit rank first, then merit score, then age of application.
export async function findWaitlist(): Promise<Admission[]> {
  return db
    .select()
    .from(admissions)
    .where(eq(admissions.status, 'waitlisted'))
    .orderBy(asc(admissions.waitlistRank), desc(admissions.score), asc(admissions.createdAt));
}

export async function findAdmissionById(id: string): Promise<Admission | undefined> {
  const result = await db.select().from(admissions).where(eq(admissions.id, id)).limit(1);
  return result[0];
}

export async function createAdmission(data: {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  class?: string;
  parentName?: string;
  parentPhone?: string;
  score?: number;
  session?: string;
}): Promise<Admission> {
  const [admission] = await db.insert(admissions).values({
    id: data.id,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    class: data.class,
    parentName: data.parentName,
    parentPhone: data.parentPhone,
    score: data.score,
    status: 'pending',
    session: data.session || '2024/2025',
  }).returning();
  return admission;
}

export async function updateAdmission(
  id: string,
  data: Partial<Pick<Admission, 'firstName' | 'lastName' | 'email' | 'phone' | 'status' | 'score' | 'session'>>
): Promise<Admission | undefined> {
  const [admission] = await db
    .update(admissions)
    .set(data)
    .where(eq(admissions.id, id))
    .returning();
  return admission;
}

export async function approveAdmission(id: string, patch?: DecisionPatch): Promise<Admission | undefined> {
  const [admission] = await db
    .update(admissions)
    .set({
      status: 'approved',
      waitlistRank: null,
      decidedBy: patch?.decidedBy ?? null,
      decidedAt: new Date(),
      decisionReason: patch?.decisionReason ?? null,
    })
    .where(eq(admissions.id, id))
    .returning();
  return admission;
}

export async function rejectAdmission(id: string, patch?: DecisionPatch): Promise<Admission | undefined> {
  const [admission] = await db
    .update(admissions)
    .set({
      status: 'rejected',
      waitlistRank: null,
      decidedBy: patch?.decidedBy ?? null,
      decidedAt: new Date(),
      decisionReason: patch?.decisionReason ?? null,
    })
    .where(eq(admissions.id, id))
    .returning();
  return admission;
}

export async function waitlistAdmission(
  id: string,
  data: { waitlistRank: number; score?: number | null; decidedBy?: string | null; decisionReason?: string | null }
): Promise<Admission | undefined> {
  const patch: Partial<NewAdmission> = {
    status: 'waitlisted',
    waitlistRank: data.waitlistRank,
    decidedBy: data.decidedBy ?? null,
    decidedAt: new Date(),
    decisionReason: data.decisionReason ?? null,
  };
  if (data.score !== undefined && data.score !== null) patch.score = data.score;

  const [admission] = await db.update(admissions).set(patch).where(eq(admissions.id, id)).returning();
  return admission;
}

export async function setWaitlistRank(id: string, rank: number): Promise<Admission | undefined> {
  const [admission] = await db
    .update(admissions)
    .set({ waitlistRank: rank })
    .where(eq(admissions.id, id))
    .returning();
  return admission;
}

export async function deleteAdmission(id: string): Promise<void> {
  await db.delete(admissions).where(eq(admissions.id, id));
}
