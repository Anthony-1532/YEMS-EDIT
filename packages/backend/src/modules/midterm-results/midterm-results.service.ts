import { generateId } from '../../shared/utils/auth.utils.js';
import * as midtermResultsRepo from './midterm-results.repo.js';
import type { MidtermResult } from '../../db/schema/midterm-results.js';

export async function getAllMidtermResults(userId: string, userRole: string, params?: { limit?: number; offset?: number }): Promise<MidtermResult[]> {
  if (userRole === 'student') {
    return midtermResultsRepo.findMidtermResultsByStudentId(userId);
  }
  return midtermResultsRepo.findAllMidtermResults(params);
}

export async function getMidtermResultsByStudentId(studentId: string): Promise<MidtermResult[]> {
  return midtermResultsRepo.findMidtermResultsByStudentId(studentId);
}

export async function getMidtermResultsByClass(className: string): Promise<MidtermResult[]> {
  return midtermResultsRepo.findMidtermResultsByClass(className);
}

export async function getMidtermResultById(id: string): Promise<MidtermResult | null> {
  const result = await midtermResultsRepo.findMidtermResultById(id);
  return result || null;
}

export async function createMidtermResult(data: {
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
  if (!data.studentId || !data.class || !data.subject) {
    throw new Error('Student ID, class, and subject are required');
  }

  return midtermResultsRepo.createMidtermResult({
    id: generateId(),
    ...data,
  });
}

export async function updateMidtermResult(
  id: string,
  data: Partial<Pick<MidtermResult, 'caScore' | 'examScore' | 'totalScore' | 'grade'>>
): Promise<MidtermResult | null> {
  const result = await midtermResultsRepo.updateMidtermResult(id, data);
  return result || null;
}

export async function deleteMidtermResult(id: string): Promise<boolean> {
  await midtermResultsRepo.deleteMidtermResult(id);
  return true;
}