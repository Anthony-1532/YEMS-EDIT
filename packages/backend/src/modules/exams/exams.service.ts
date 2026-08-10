import { generateId } from '../../shared/utils/auth.utils.js';
import * as examsRepo from './exams.repo.js';
import type { Exam } from '../../db/schema/exams.js';

export interface GradableQuestion {
  id?: string;
  options?: string[];
  points?: number;
  marks?: number;
  correctIndex?: number;
  correct?: number;
  type?: string;
}

/**
 * Grade a set of MCQ answers against the exam's real answer key.
 * A question is scored only when it exposes a correct option index
 * (`correctIndex` or legacy `correct`). The student's answer may be provided
 * either as the selected option text or the selected option index, and keyed
 * by question id or 1-based position. There is no random or mock scoring.
 */
export function gradeMcqAnswers(
  questions: GradableQuestion[],
  answers: Record<string, any>
): { score: number; totalScore: number } {
  let score = 0;
  let totalScore = 0;
  const safeAnswers = answers || {};

  questions.forEach((q, idx) => {
    const points = q.marks ?? q.points ?? 5;
    totalScore += points;

    const correctIndex = q.correctIndex ?? q.correct;
    if (correctIndex === undefined || correctIndex === null) return;
    if (!Array.isArray(q.options)) return;

    const studentAnswer = safeAnswers[q.id ?? ''] ?? safeAnswers[String(idx + 1)];
    if (studentAnswer === undefined || studentAnswer === null) return;

    const correctOption = q.options[correctIndex];
    const answerMatches =
      studentAnswer === correctOption ||
      studentAnswer === correctIndex ||
      String(studentAnswer) === String(correctIndex);

    if (answerMatches) {
      score += points;
    }
  });

  return { score, totalScore };
}

export async function getAllExams(
  filters?: { type?: string; createdBy?: string; search?: string; limit?: number; offset?: number; subjects?: string[] }
): Promise<Exam[]> {
  return examsRepo.findAllExams(filters);
}

export async function getExamById(id: string): Promise<Exam | null> {
  const exam = await examsRepo.findExamById(id);
  return exam || null;
}

export async function createExam(data: {
  title: string;
  type: 'quiz' | 'midterm' | 'final' | 'practice';
  description?: string;
  questions?: Exam['questions'];
  questionsList?: Exam['questionsList'];
  questionsCount?: number;
  duration?: number;
  passingScore?: number;
  class?: string;
  subject?: string;
  format?: Exam['format'];
  status?: Exam['status'];
  showResults?: boolean;
  startTime?: string | Date;
  availableFrom?: string | Date;
  fileData?: string;
  fileName?: string;
  createdBy: string;
}): Promise<Exam> {
  return examsRepo.createExam({
    id: generateId(),
    title: data.title,
    type: data.type,
    desc: data.description,
    questions: data.questions,
    questionsList: data.questionsList,
    questionsCount: data.questionsCount,
    duration: data.duration,
    passingScore: data.passingScore,
    class: data.class,
    subject: data.subject,
    format: data.format,
    status: data.status,
    showResults: data.showResults ?? false,
    startTime: data.startTime ? new Date(data.startTime) : undefined,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
    fileData: data.fileData,
    fileName: data.fileName,
    createdBy: data.createdBy
  });
}

export async function updateExam(
  id: string,
  data: {
    title?: string;
    type?: 'quiz' | 'midterm' | 'final' | 'practice';
    description?: string;
    questions?: Exam['questions'];
    questionsList?: Exam['questionsList'];
    questionsCount?: number;
    duration?: number;
    passingScore?: number;
    class?: string;
    subject?: string;
    format?: Exam['format'];
    status?: Exam['status'];
    showResults?: boolean;
    startTime?: string | Date;
    availableFrom?: string | Date;
  }
): Promise<Exam | null> {
  const exam = await examsRepo.updateExam(id, {
    title: data.title,
    type: data.type,
    desc: data.description,
    questions: data.questions,
    questionsList: data.questionsList,
    questionsCount: data.questionsCount,
    duration: data.duration,
    passingScore: data.passingScore,
    class: data.class,
    subject: data.subject,
    format: data.format,
    status: data.status,
    showResults: data.showResults,
    startTime: data.startTime ? new Date(data.startTime) : undefined,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined
  });
  return exam || null;
}

export async function deleteExam(id: string): Promise<boolean> {
  await examsRepo.deleteExam(id);
  return true;
}
