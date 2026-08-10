import { generateId } from '../../shared/utils/auth.utils.js';
import logger from '../../config/logger.js';
import * as submissionsRepo from './submissions.repo.js';
import type { Submission } from '../../db/schema/submissions.js';
import { ConflictError } from '../../shared/errors/app-error.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';

export async function getAllSubmissions(userId: string, userRole: string, params?: { limit?: number; offset?: number }): Promise<Submission[]> {
  if (userRole === 'student') {
    return submissionsRepo.findSubmissionsByStudentId(userId);
  }
  return submissionsRepo.findAllSubmissions(params);
}

export async function getSubmissionsByExamId(examId: string): Promise<Submission[]> {
  return submissionsRepo.findSubmissionsByExamId(examId);
}

export async function getSubmissionsByStudentId(studentId: string): Promise<Submission[]> {
  return submissionsRepo.findSubmissionsByStudentId(studentId);
}

export async function getSubmissionsByAssignmentId(assignmentId: string): Promise<Submission[]> {
  return submissionsRepo.findSubmissionsByAssignmentId(assignmentId);
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const submission = await submissionsRepo.findSubmissionById(id);
  return submission || null;
}

export async function getSubmissionDetails(id: string): Promise<any> {
  const submission = await submissionsRepo.findSubmissionById(id);
  if (!submission) return null;
  const student = await db.select().from(users).where(eq(users.id, submission.studentId)).limit(1).then((rows) => rows[0]);
  return {
    ...submission,
    studentName: student?.name || null,
    studentClass: student?.class || null,
  };
}

import { getSubmissionsQueue } from './submissions.worker.js';

export async function createSubmission(data: {
  examId: string;
  studentId: string;
  answers: Record<string, any>;
}): Promise<Submission> {
  if (!data.examId || !data.studentId || !data.answers) {
    throw new BadRequestError('Exam ID, student ID, and answers are required');
  }

  const submission = await submissionsRepo.createSubmissionIfNotExists({
    id: generateId(),
    ...data,
  });

  if (!submission) {
    throw new ConflictError('Submission already exists for this exam and student');
  }

  // Queue for async grading
  try {
    const queue = getSubmissionsQueue();
    await queue.add('grade-submission', {
      submissionId: submission.id,
      examId: submission.examId,
      studentId: submission.studentId,
      answers: submission.answers ?? {},
      type: 'exam',
    });
  } catch (err) {
    // Log queue error but don't fail the request since submission is saved
    logger.error('Failed to queue submission for grading', err);
  }

  return submission;
}

export async function gradeSubmission(
  id: string,
  data: {
    score: number;
    totalScore: number;
    gradedBy: string;
    feedback?: string;
  }
): Promise<Submission | null> {
  const submission = await submissionsRepo.gradeSubmission(id, data);
  return submission || null;
}

export async function updateSubmission(
  id: string,
  data: Partial<Pick<Submission, 'answers'>>
): Promise<Submission | null> {
  const submission = await submissionsRepo.updateSubmission(id, data);
  return submission || null;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  await submissionsRepo.deleteSubmission(id);
  return true;
}
