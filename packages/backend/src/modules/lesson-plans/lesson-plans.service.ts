import { generateId } from '../../shared/utils/auth.utils.js';
import * as lessonPlansRepo from './lesson-plans.repo.js';
import type { LessonPlan } from '../../db/schema/lesson-plans.js';

export async function getAllLessonPlans(params?: { limit?: number; offset?: number }): Promise<LessonPlan[]> {
  return lessonPlansRepo.findAllLessonPlans(params);
}

export async function getLessonPlansBySubject(subject: string): Promise<LessonPlan[]> {
  return lessonPlansRepo.findLessonPlansBySubject(subject);
}

export async function getLessonPlansByClass(className: string): Promise<LessonPlan[]> {
  return lessonPlansRepo.findLessonPlansByClass(className);
}

export async function getLessonPlansByTeacherId(teacherId: string): Promise<LessonPlan[]> {
  return lessonPlansRepo.findLessonPlansByTeacherId(teacherId);
}

export async function getLessonPlanById(id: string): Promise<LessonPlan | null> {
  const lessonPlan = await lessonPlansRepo.findLessonPlanById(id);
  return lessonPlan || null;
}

export async function createLessonPlan(data: {
  subject: string;
  topic: string;
  week?: string;
  term?: string;
  class?: string;
  objectives?: string;
  materials?: string;
  createdBy?: string;
}): Promise<LessonPlan> {
  if (!data.subject || !data.topic) {
    throw new Error('Subject and topic are required');
  }

  return lessonPlansRepo.createLessonPlan({
    id: generateId(),
    ...data,
  });
}

export async function updateLessonPlan(
  id: string,
  data: Partial<Pick<LessonPlan, 'topic' | 'week' | 'term' | 'objectives' | 'materials'>>
): Promise<LessonPlan | null> {
  const lessonPlan = await lessonPlansRepo.updateLessonPlan(id, data);
  return lessonPlan || null;
}

export async function deleteLessonPlan(id: string): Promise<boolean> {
  await lessonPlansRepo.deleteLessonPlan(id);
  return true;
}