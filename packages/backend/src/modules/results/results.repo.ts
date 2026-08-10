import { db } from '../../config/db.js';
import { results } from '../../db/schema/results.js';
import { users } from '../../db/schema/users.js';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import type { Result, NewResult } from '../../db/schema/results.js';

export interface ResultFilters {
  studentId?: string;
  class?: string;
  session?: string;
  term?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
  classes?: string[];
}

export interface ResultWithStudentName extends Result {
  studentName?: string;
}

export async function findAllResults(filters?: ResultFilters): Promise<ResultWithStudentName[]> {
  const conditions = [];

  if (filters?.studentId) {
    conditions.push(eq(results.studentId, filters.studentId));
  }

  if (filters?.class) {
    conditions.push(eq(results.class, filters.class));
  }

  const teacherScopeConditions = [];
  if (filters?.subjects && filters.subjects.length > 0) {
    teacherScopeConditions.push(inArray(results.subject, filters.subjects));
  }
  if (filters?.classes && filters.classes.length > 0) {
    teacherScopeConditions.push(inArray(results.class, filters.classes));
  }

  if (teacherScopeConditions.length > 0) {
    if (teacherScopeConditions.length === 1) {
      conditions.push(teacherScopeConditions[0]);
    } else {
      conditions.push(or(...teacherScopeConditions));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: results.id,
      studentId: results.studentId,
      examId: results.examId,
      subject: results.subject,
      score: results.score,
      totalScore: results.totalScore,
      grade: results.grade,
      remarks: results.remarks,
      class: results.class,
      session: results.session,
      term: results.term,
      examTitle: results.examTitle,
      date: results.date,
      createdAt: results.createdAt,
      studentName: users.name,
    })
    .from(results)
    .leftJoin(users, eq(results.studentId, users.id))
    .where(where)
    .orderBy(desc(results.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);

  return rows as ResultWithStudentName[];
}

export async function findResultsByStudentId(studentId: string): Promise<ResultWithStudentName[]> {
  const rows = await db
    .select({
      id: results.id,
      studentId: results.studentId,
      examId: results.examId,
      subject: results.subject,
      score: results.score,
      totalScore: results.totalScore,
      grade: results.grade,
      remarks: results.remarks,
      class: results.class,
      session: results.session,
      term: results.term,
      examTitle: results.examTitle,
      date: results.date,
      createdAt: results.createdAt,
      studentName: users.name,
    })
    .from(results)
    .leftJoin(users, eq(results.studentId, users.id))
    .where(eq(results.studentId, studentId))
    .orderBy(desc(results.createdAt));

  return rows as ResultWithStudentName[];
}

export async function findResultById(id: string): Promise<ResultWithStudentName | undefined> {
  const rows = await db
    .select({
      id: results.id,
      studentId: results.studentId,
      examId: results.examId,
      subject: results.subject,
      score: results.score,
      totalScore: results.totalScore,
      grade: results.grade,
      remarks: results.remarks,
      class: results.class,
      session: results.session,
      term: results.term,
      examTitle: results.examTitle,
      date: results.date,
      createdAt: results.createdAt,
      studentName: users.name,
    })
    .from(results)
    .leftJoin(users, eq(results.studentId, users.id))
    .where(eq(results.id, id))
    .limit(1);

  return rows[0] as ResultWithStudentName | undefined;
}

export async function createResult(data: {
  id: string;
  studentId: string;
  examId?: string;
  subject: string;
  score: number;
  totalScore: number;
  grade?: string;
  remarks?: string;
  class?: string;
  session?: string;
  term?: string;
  examTitle?: string;
  date?: string;
}): Promise<Result> {
  const [result] = await db.insert(results).values({
    id: data.id,
    studentId: data.studentId,
    examId: data.examId,
    subject: data.subject,
    score: data.score,
    totalScore: data.totalScore,
    grade: data.grade,
    remarks: data.remarks,
    class: data.class,
    session: data.session,
    term: data.term,
    examTitle: data.examTitle,
    date: data.date,
  }).returning();
  return result;
}

export async function updateResult(
  id: string,
  data: Partial<Pick<Result, 'score' | 'grade' | 'remarks' | 'subject'>>
): Promise<Result | undefined> {
  const [result] = await db
    .update(results)
    .set(data)
    .where(eq(results.id, id))
    .returning();
  return result;
}

export async function deleteResult(id: string): Promise<void> {
  await db.delete(results).where(eq(results.id, id));
}