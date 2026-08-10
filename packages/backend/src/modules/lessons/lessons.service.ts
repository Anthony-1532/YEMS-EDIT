import { generateId } from '../../shared/utils/auth.utils.js';
import * as lessonsRepo from './lessons.repo.js';
import type { Lesson } from '../../db/schema/lessons.js';

export async function getAllLessons(params?: { limit?: number; offset?: number }): Promise<Lesson[]> {
  return lessonsRepo.findAllLessons(params);
}

export async function getLiveLessons(): Promise<Lesson[]> {
  return lessonsRepo.findLiveLessons();
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const lesson = await lessonsRepo.findLessonById(id);
  return lesson || null;
}

export async function createLesson(data: {
  subject: string;
  topic: string;
  time?: string;
  isLive?: boolean;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}): Promise<Lesson> {
  if (!data.subject || !data.topic) {
    throw new Error('Subject and topic are required');
  }

  return lessonsRepo.createLesson({
    id: generateId(),
    ...data,
  });
}

export async function updateLesson(
  id: string,
  data: Partial<Pick<Lesson, 'subject' | 'topic' | 'time' | 'isLive'>>
): Promise<Lesson | null> {
  const lesson = await lessonsRepo.updateLesson(id, data);
  return lesson || null;
}

export async function deleteLesson(id: string): Promise<boolean> {
  await lessonsRepo.deleteLesson(id);
  return true;
}