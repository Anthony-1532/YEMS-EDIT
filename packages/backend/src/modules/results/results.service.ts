import { generateId } from '../../shared/utils/auth.utils.js';
import * as resultsRepo from './results.repo.js';
import type { Result } from '../../db/schema/results.js';
import type { ResultWithStudentName } from './results.repo.js';
import { db } from '../../config/db.js';
import { exams } from '../../db/schema/exams.js';
import { inArray } from 'drizzle-orm';

export interface GetResultsParams {
  studentId?: string;
  class?: string;
  session?: string;
  term?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
  classes?: string[];
}

async function maskHiddenResults(studentResults: ResultWithStudentName[]): Promise<ResultWithStudentName[]> {
  if (studentResults.length === 0) return studentResults;

  const examIds = studentResults.map((r) => r.examId).filter(Boolean) as string[];
  if (examIds.length === 0) return studentResults;

  // Load matching exams to check showResults flag
  const dbExams = await db
    .select({ id: exams.id, showResults: exams.showResults })
    .from(exams)
    .where(inArray(exams.id, examIds));
  const showResultsMap = new Map(dbExams.map((e) => [e.id, e.showResults]));

  // Always return all results so the frontend can block retakes.
  // When showResults is false, mask score/grade/remarks so student/parent sees
  // "Completed" but not the actual marks.
  return studentResults.map((r) => {
    if (!r.examId) return r;
    const canSee = showResultsMap.get(r.examId) === true;
    if (canSee) return r;
    return {
      ...r,
      score: null as any,
      totalScore: null as any,
      grade: 'Hidden',
      remarks: 'Results not yet published for this assessment.',
    };
  });
}

export async function getAllResults(userId: string, userRole: string, params?: GetResultsParams): Promise<ResultWithStudentName[]> {
  if (userRole === 'student') {
    const studentResults = await resultsRepo.findResultsByStudentId(userId);
    return maskHiddenResults(studentResults);
  }
  return resultsRepo.findAllResults(params);
}

export async function getResultsByStudentId(studentId: string, userRole?: string): Promise<ResultWithStudentName[]> {
  const studentResults = await resultsRepo.findResultsByStudentId(studentId);
  if (userRole === 'student' || userRole === 'parent') {
    return maskHiddenResults(studentResults);
  }
  return studentResults;
}

export async function getResultById(id: string): Promise<ResultWithStudentName | null> {
  const result = await resultsRepo.findResultById(id);
  return result || null;
}

export async function createResult(data: {
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
  if (!data.studentId || !data.subject || data.score === undefined) {
    throw new Error('Student ID, subject, and score are required');
  }

  return resultsRepo.createResult({
    id: generateId(),
    ...data,
  });
}

export async function updateResult(
  id: string,
  data: Partial<Pick<Result, 'score' | 'grade' | 'remarks' | 'subject'>>
): Promise<Result | null> {
  const result = await resultsRepo.updateResult(id, data);
  return result || null;
}

export async function deleteResult(id: string): Promise<boolean> {
  await resultsRepo.deleteResult(id);
  return true;
}