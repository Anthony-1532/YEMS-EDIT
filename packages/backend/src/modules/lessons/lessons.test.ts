import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as lessonsRepo from '../lessons/lessons.repo.js';
import * as lessonsService from '../lessons/lessons.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: () => Promise.resolve([]),
        }),
        orderBy: () => Promise.resolve([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Lessons Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllLessons', () => {
    it('should return all lessons', async () => {
      const mockLessons = [
        { id: '1', subject: 'Math', topic: 'Algebra' },
        { id: '2', subject: 'Science', topic: 'Physics' },
      ];
      
      vi.spyOn(lessonsRepo, 'findAllLessons').mockResolvedValue(mockLessons as any);
      
      const result = await lessonsService.getAllLessons();
      
      expect(result).toEqual(mockLessons);
    });
  });

  describe('getLiveLessons', () => {
    it('should return only live lessons', async () => {
      const mockLessons = [
        { id: '1', subject: 'Math', isLive: true },
      ];
      
      vi.spyOn(lessonsRepo, 'findLiveLessons').mockResolvedValue(mockLessons as any);
      
      const result = await lessonsService.getLiveLessons();
      
      expect(result).toEqual(mockLessons);
      expect(result[0].isLive).toBe(true);
    });
  });

  describe('getLessonById', () => {
    it('should return lesson when found', async () => {
      const mockLesson = { id: '1', subject: 'Math' };
      vi.spyOn(lessonsRepo, 'findLessonById').mockResolvedValue(mockLesson as any);
      
      const result = await lessonsService.getLessonById('1');
      
      expect(result).toEqual(mockLesson);
    });

    it('should return null when not found', async () => {
      vi.spyOn(lessonsRepo, 'findLessonById').mockResolvedValue(undefined);
      
      const result = await lessonsService.getLessonById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createLesson', () => {
    it('should create lesson with valid data', async () => {
      const lessonData = {
        subject: 'Math',
        topic: 'Algebra',
      };
      
      const created = { id: 'new-id', ...lessonData };
      vi.spyOn(lessonsRepo, 'createLesson').mockResolvedValue(created as any);
      
      const result = await lessonsService.createLesson(lessonData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when subject is missing', async () => {
      const lessonData = {
        topic: 'Algebra',
      };
      
      await expect(lessonsService.createLesson(lessonData as any)).rejects.toThrow('Subject and topic are required');
    });
  });

  describe('updateLesson', () => {
    it('should update lesson', async () => {
      const updated = { id: '1', topic: 'Updated Topic' };
      vi.spyOn(lessonsRepo, 'updateLesson').mockResolvedValue(updated as any);
      
      const result = await lessonsService.updateLesson('1', { topic: 'Updated Topic' });
      
      expect(result?.topic).toBe('Updated Topic');
    });
  });

  describe('deleteLesson', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(lessonsRepo, 'deleteLesson').mockResolvedValue(undefined);
      
      const result = await lessonsService.deleteLesson('1');
      
      expect(result).toBe(true);
    });
  });
});