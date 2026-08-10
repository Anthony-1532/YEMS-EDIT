import { db } from '../../config/db.js';
import { exams } from '../../db/schema/exams.js';
import { eq, ilike, or, and, desc, inArray } from 'drizzle-orm';
import type { Exam } from '../../db/schema/exams.js';

export async function findAllExams(filters?: {
  type?: string;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
  class?: string;
}): Promise<Exam[]> {
  const conditions = [];

  if (filters?.type) {
    conditions.push(eq(exams.type, filters.type as any));
  }

  if (filters?.class) {
    conditions.push(eq(exams.class, filters.class));
  }

  if (filters?.subjects && filters.subjects.length > 0) {
    if (filters.createdBy) {
      conditions.push(or(inArray(exams.subject, filters.subjects), eq(exams.createdBy, filters.createdBy)));
    } else {
      conditions.push(inArray(exams.subject, filters.subjects));
    }
  } else if (filters?.createdBy) {
    conditions.push(eq(exams.createdBy, filters.createdBy));
  }

  if (filters?.search) {
    conditions.push(or(ilike(exams.title, `%${filters.search}%`), ilike(exams.desc, `%${filters.search}%`)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(exams)
    .where(where)
    .orderBy(desc(exams.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findExamById(id: string): Promise<Exam | undefined> {
  const result = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  return result[0];
}

export async function createExam(data: {
  id: string;
  title: string;
  type: Exam['type'];
  desc?: string;
  questions?: Exam['questions'];
  duration?: number;
  passingScore?: number;
  createdBy: string;
  class?: string;
  subject?: string;
  status?: Exam['status'];
  format?: Exam['format'];
  showResults?: boolean;
  icon?: string;
  bg?: string;
  iconColor?: string;
  questionsCount?: number;
  questionsList?: Exam['questionsList'];
  startTime?: Date;
  availableFrom?: Date;
  fileData?: string;
  fileName?: string;
}): Promise<Exam> {
  const [exam] = await db.insert(exams).values(data as any).returning();
  return exam;
}

export async function updateExam(
  id: string,
  data: Partial<Pick<Exam, 'title' | 'type' | 'desc' | 'questions' | 'duration' | 'passingScore' | 'class' | 'subject' | 'status' | 'icon' | 'bg' | 'iconColor' | 'questionsCount' | 'questionsList' | 'format' | 'startTime' | 'availableFrom' | 'fileData' | 'fileName' | 'showResults'>>
): Promise<Exam | undefined> {
  const [exam] = await db
    .update(exams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(exams.id, id))
    .returning();
  return exam;
}

export async function deleteExam(id: string): Promise<void> {
  await db.delete(exams).where(eq(exams.id, id));
}
