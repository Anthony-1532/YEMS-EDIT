import { db } from '../../config/db.js';
import { schemes } from '../../db/schema/schemes.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { Scheme, NewScheme } from '../../db/schema/schemes.js';

export interface SchemeFilters {
  subject?: string;
  class?: string;
  term?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
}

export async function findAllSchemes(filters?: SchemeFilters): Promise<Scheme[]> {
  const conditions = [];
  
  if (filters?.subject) {
    conditions.push(eq(schemes.subject, filters.subject));
  }
  
  if (filters?.class) {
    conditions.push(eq(schemes.class, filters.class));
  }

  if (filters?.subjects && filters.subjects.length > 0) {
    conditions.push(inArray(schemes.subject, filters.subjects));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(schemes)
    .where(where)
    .orderBy(desc(schemes.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findSchemesBySubject(subject: string): Promise<Scheme[]> {
  return db.select().from(schemes).where(eq(schemes.subject, subject));
}

export async function findSchemesByClass(className: string): Promise<Scheme[]> {
  return db.select().from(schemes).where(eq(schemes.class, className));
}

export async function findSchemeById(id: string): Promise<Scheme | undefined> {
  const result = await db.select().from(schemes).where(eq(schemes.id, id)).limit(1);
  return result[0];
}

export async function createScheme(data: {
  id: string;
  subject: string;
  title: string;
  description?: string;
  week?: string;
  term?: string;
  class?: string;
  createdBy?: string;
}): Promise<Scheme> {
  const [scheme] = await db.insert(schemes).values({
    id: data.id,
    subject: data.subject,
    title: data.title,
    description: data.description,
    week: data.week,
    term: data.term,
    class: data.class,
    createdBy: data.createdBy,
  }).returning();
  return scheme;
}

export async function updateScheme(
  id: string,
  data: Partial<Pick<Scheme, 'title' | 'description' | 'week' | 'term'>>
): Promise<Scheme | undefined> {
  const [scheme] = await db
    .update(schemes)
    .set(data)
    .where(eq(schemes.id, id))
    .returning();
  return scheme;
}

export async function deleteScheme(id: string): Promise<void> {
  await db.delete(schemes).where(eq(schemes.id, id));
}