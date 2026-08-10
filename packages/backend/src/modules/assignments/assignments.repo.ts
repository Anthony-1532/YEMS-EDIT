import { db } from '../../config/db.js';
import { assignments } from '../../db/schema/assignments.js';
import { eq, ilike, or, and, desc, inArray } from 'drizzle-orm';
import type { Assignment } from '../../db/schema/assignments.js';

export async function findAllAssignments(filters?: {
  subject?: string;
  status?: string;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
}): Promise<Assignment[]> {
  const conditions = [];

  if (filters?.subject) {
    conditions.push(eq(assignments.subject, filters.subject));
  }

  if (filters?.status) {
    conditions.push(eq(assignments.status, filters.status as any));
  }

  if (filters?.subjects && filters.subjects.length > 0) {
    if (filters.createdBy) {
      conditions.push(or(inArray(assignments.subject, filters.subjects), eq(assignments.createdBy, filters.createdBy)));
    } else {
      conditions.push(inArray(assignments.subject, filters.subjects));
    }
  } else if (filters?.createdBy) {
    conditions.push(eq(assignments.createdBy, filters.createdBy));
  }

  if (filters?.search) {
    conditions.push(or(ilike(assignments.title, `%${filters.search}%`), ilike(assignments.desc, `%${filters.search}%`)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(assignments)
    .where(where)
    .orderBy(desc(assignments.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findAssignmentById(id: string): Promise<Assignment | undefined> {
  const result = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
  return result[0];
}

export async function createAssignment(data: {
  id: string;
  title: string;
  desc?: string;
  description?: string;
  subject?: string;
  class?: string;
  status?: Assignment['status'];
  dueDate?: Date;
  availableFrom?: Date;
  dueLabel?: string;
  dueClass?: Assignment['dueClass'];
  est?: string;
  icon?: string;
  iconColor?: string;
  createdBy: string;
}): Promise<Assignment> {
  const [assignment] = await db.insert(assignments).values(data as any).returning();
  return assignment;
}

export async function updateAssignment(
  id: string,
  data: Partial<Pick<Assignment, 'title' | 'desc' | 'subject' | 'class' | 'status' | 'dueDate' | 'availableFrom' | 'dueLabel' | 'dueClass' | 'est' | 'icon' | 'iconColor'>>
): Promise<Assignment | undefined> {
  const [assignment] = await db
    .update(assignments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assignments.id, id))
    .returning();
  return assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  await db.delete(assignments).where(eq(assignments.id, id));
}

export async function deleteAllAssignments(): Promise<void> {
  await db.delete(assignments);
}