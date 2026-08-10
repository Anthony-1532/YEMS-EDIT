import { db } from '../../config/db.js';
import { midtermResults } from '../../db/schema/midterm-results.js';
import { eq, desc } from 'drizzle-orm';
import type { MidtermResult, NewMidtermResult } from '../../db/schema/midterm-results.js';

export async function findAllMidtermResults(params?: { limit?: number; offset?: number }): Promise<MidtermResult[]> {
  return db
    .select()
    .from(midtermResults)
    .orderBy(desc(midtermResults.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);
}

export async function findMidtermResultsByStudentId(studentId: string): Promise<MidtermResult[]> {
  return db.select().from(midtermResults).where(eq(midtermResults.studentId, studentId)).orderBy(desc(midtermResults.createdAt));
}

export async function findMidtermResultsByClass(className: string): Promise<MidtermResult[]> {
  return db.select().from(midtermResults).where(eq(midtermResults.class, className));
}

export async function findMidtermResultById(id: string): Promise<MidtermResult | undefined> {
  const result = await db.select().from(midtermResults).where(eq(midtermResults.id, id)).limit(1);
  return result[0];
}

export async function createMidtermResult(data: {
  id: string;
  studentId: string;
  studentName?: string;
  class: string;
  subject: string;
  caScore?: number;
  examScore?: number;
  totalScore?: number;
  grade?: string;
  term?: string;
  session?: string;
}): Promise<MidtermResult> {
  const [midtermResult] = await db.insert(midtermResults).values({
    id: data.id,
    studentId: data.studentId,
    studentName: data.studentName,
    class: data.class,
    subject: data.subject,
    caScore: data.caScore,
    examScore: data.examScore,
    totalScore: data.totalScore,
    grade: data.grade,
    term: data.term,
    session: data.session,
  }).returning();
  return midtermResult;
}

export async function updateMidtermResult(
  id: string,
  data: Partial<Pick<MidtermResult, 'caScore' | 'examScore' | 'totalScore' | 'grade'>>
): Promise<MidtermResult | undefined> {
  const [midtermResult] = await db
    .update(midtermResults)
    .set(data)
    .where(eq(midtermResults.id, id))
    .returning();
  return midtermResult;
}

export async function deleteMidtermResult(id: string): Promise<void> {
  await db.delete(midtermResults).where(eq(midtermResults.id, id));
}