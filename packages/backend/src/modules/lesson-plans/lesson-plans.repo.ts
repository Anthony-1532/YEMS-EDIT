import { db } from '../../config/db.js';
import { lessonPlans } from '../../db/schema/lesson-plans.js';
import { eq, desc } from 'drizzle-orm';
import type { LessonPlan, NewLessonPlan } from '../../db/schema/lesson-plans.js';

export interface LessonPlanFilters {
  subject?: string;
  class?: string;
  teacherId?: string;
  limit?: number;
  offset?: number;
}

export async function findAllLessonPlans(filters?: LessonPlanFilters): Promise<LessonPlan[]> {
  return db
    .select()
    .from(lessonPlans)
    .orderBy(desc(lessonPlans.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findLessonPlansBySubject(subject: string): Promise<LessonPlan[]> {
  return db.select().from(lessonPlans).where(eq(lessonPlans.subject, subject));
}

export async function findLessonPlansByClass(className: string): Promise<LessonPlan[]> {
  return db.select().from(lessonPlans).where(eq(lessonPlans.class, className));
}

export async function findLessonPlansByTeacherId(teacherId: string): Promise<LessonPlan[]> {
  return db.select().from(lessonPlans).where(eq(lessonPlans.createdBy, teacherId));
}

export async function findLessonPlanById(id: string): Promise<LessonPlan | undefined> {
  const result = await db.select().from(lessonPlans).where(eq(lessonPlans.id, id)).limit(1);
  return result[0];
}

export async function createLessonPlan(data: {
  id: string;
  subject: string;
  topic: string;
  week?: string;
  term?: string;
  class?: string;
  objectives?: string;
  materials?: string;
  createdBy?: string;
}): Promise<LessonPlan> {
  const [lessonPlan] = await db.insert(lessonPlans).values({
    id: data.id,
    subject: data.subject,
    topic: data.topic,
    week: data.week,
    term: data.term,
    class: data.class,
    objectives: data.objectives,
    materials: data.materials,
    createdBy: data.createdBy,
  }).returning();
  return lessonPlan;
}

export async function updateLessonPlan(
  id: string,
  data: Partial<Pick<LessonPlan, 'topic' | 'week' | 'term' | 'objectives' | 'materials'>>
): Promise<LessonPlan | undefined> {
  const [lessonPlan] = await db
    .update(lessonPlans)
    .set(data)
    .where(eq(lessonPlans.id, id))
    .returning();
  return lessonPlan;
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await db.delete(lessonPlans).where(eq(lessonPlans.id, id));
}