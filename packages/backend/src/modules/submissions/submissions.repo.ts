import { db } from '../../config/db.js';
import { submissions } from '../../db/schema/submissions.js';
import { eq, desc, and } from 'drizzle-orm';
import type { Submission, NewSubmission } from '../../db/schema/submissions.js';

export async function findAllSubmissions(params?: { limit?: number; offset?: number }): Promise<Submission[]> {
  return db
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0);
}

export async function findSubmissionsByStudentId(studentId: string): Promise<Submission[]> {
  return db.select().from(submissions).where(eq(submissions.studentId, studentId)).orderBy(desc(submissions.createdAt));
}

export async function findSubmissionsByExamId(examId: string): Promise<Submission[]> {
  return db.select().from(submissions).where(eq(submissions.examId, examId)).orderBy(desc(submissions.createdAt));
}

export async function findSubmissionsByAssignmentId(assignmentId: string): Promise<Submission[]> {
  return db.select().from(submissions).where(eq(submissions.examId, assignmentId)).orderBy(desc(submissions.createdAt));
}

export async function findSubmissionById(id: string): Promise<Submission | undefined> {
  const result = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return result[0];
}

export async function createSubmission(data: {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, any>;
}): Promise<Submission> {
  const [submission] = await db.insert(submissions).values({
    id: data.id,
    examId: data.examId,
    studentId: data.studentId,
    answers: data.answers,
    submittedAt: new Date(),
  }).returning();
  return submission;
}

export async function createSubmissionIfNotExists(data: {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, any>;
}): Promise<Submission | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(submissions)
      .where(and(eq(submissions.examId, data.examId), eq(submissions.studentId, data.studentId)))
      .limit(1);

    if (existing) return null;

    // Never trust client-supplied scores. Score/totalScore are initialized to
    // null here and set exclusively by the grading worker via gradeSubmission().
    try {
      const [submission] = await tx
        .insert(submissions)
        .values({
          id: data.id,
          examId: data.examId,
          studentId: data.studentId,
          answers: data.answers,
          score: null,
          totalScore: null,
          submittedAt: new Date(),
        })
        .returning();
      return submission ?? null;
    } catch (error: any) {
      if (error?.code === '23505') {
        return null;
      }
      throw error;
    }
  });
}

export async function gradeSubmission(
  id: string,
  data: {
    score: number;
    totalScore: number;
    gradedBy: string;
    feedback?: string;
  }
): Promise<Submission | undefined> {
  const [submission] = await db
    .update(submissions)
    .set({
      score: data.score,
      totalScore: data.totalScore,
      gradedBy: data.gradedBy,
      gradedAt: new Date(),
      feedback: data.feedback,
    })
    .where(eq(submissions.id, id))
    .returning();
  return submission;
}

export async function updateSubmission(
  id: string,
  data: Partial<Pick<Submission, 'answers'>>
): Promise<Submission | undefined> {
  const [submission] = await db
    .update(submissions)
    .set(data)
    .where(eq(submissions.id, id))
    .returning();
  return submission;
}

export async function deleteSubmission(id: string): Promise<void> {
  await db.delete(submissions).where(eq(submissions.id, id));
}
