import { db } from '../../config/db.js';
import { lessons } from '../../db/schema/lessons.js';
import { eq, desc } from 'drizzle-orm';
import type { Lesson, NewLesson } from '../../db/schema/lessons.js';

export async function findAllLessons(params?: { limit?: number; offset?: number }): Promise<Lesson[]> {
  return db
    .select()
    .from(lessons)
    .orderBy(desc(lessons.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);
}

export async function findLiveLessons(): Promise<Lesson[]> {
  return db.select().from(lessons).where(eq(lessons.isLive, true));
}

export async function findLessonById(id: string): Promise<Lesson | undefined> {
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0];
}

export async function createLesson(data: {
  id: string;
  subject: string;
  topic: string;
  time?: string;
  isLive?: boolean;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}): Promise<Lesson> {
  const [lesson] = await db.insert(lessons).values({
    id: data.id,
    subject: data.subject,
    topic: data.topic,
    time: data.time,
    isLive: data.isLive ?? false,
    icon: data.icon,
    iconBg: data.iconBg,
    iconColor: data.iconColor,
  }).returning();
  return lesson;
}

export async function updateLesson(
  id: string,
  data: Partial<Pick<Lesson, 'subject' | 'topic' | 'time' | 'isLive'>>
): Promise<Lesson | undefined> {
  const [lesson] = await db
    .update(lessons)
    .set(data)
    .where(eq(lessons.id, id))
    .returning();
  return lesson;
}

export async function deleteLesson(id: string): Promise<void> {
  await db.delete(lessons).where(eq(lessons.id, id));
}