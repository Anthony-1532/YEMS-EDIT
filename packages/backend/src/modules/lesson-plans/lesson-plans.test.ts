import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as lessonPlansRepo from '../lesson-plans/lesson-plans.repo.js';
import * as lessonPlansService from '../lesson-plans/lesson-plans.service.js';

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

describe('Lesson Plans Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllLessonPlans', () => {
    it('should return all lesson plans', async () => {
      const mockPlans = [
        { id: '1', subject: 'Math', topic: 'Algebra' },
        { id: '2', subject: 'Science', topic: 'Physics' },
      ];
      
      vi.spyOn(lessonPlansRepo, 'findAllLessonPlans').mockResolvedValue(mockPlans as any);
      
      const result = await lessonPlansService.getAllLessonPlans();
      
      expect(result).toEqual(mockPlans);
    });
  });

  describe('getLessonPlansBySubject', () => {
    it('should return lesson plans for specific subject', async () => {
      const mockPlans = [
        { id: '1', subject: 'Math', topic: 'Algebra' },
      ];
      
      vi.spyOn(lessonPlansRepo, 'findLessonPlansBySubject').mockResolvedValue(mockPlans as any);
      
      const result = await lessonPlansService.getLessonPlansBySubject('Math');
      
      expect(result).toEqual(mockPlans);
    });
  });

  describe('getLessonPlansByClass', () => {
    it('should return lesson plans for specific class', async () => {
      const mockPlans = [
        { id: '1', class: 'JSS1', topic: 'Algebra' },
      ];
      
      vi.spyOn(lessonPlansRepo, 'findLessonPlansByClass').mockResolvedValue(mockPlans as any);
      
      const result = await lessonPlansService.getLessonPlansByClass('JSS1');
      
      expect(result).toEqual(mockPlans);
    });
  });

  describe('getLessonPlansByTeacherId', () => {
    it('should return lesson plans for specific teacher', async () => {
      const mockPlans = [
        { id: '1', createdBy: 'teacher-1', topic: 'Algebra' },
      ];
      
      vi.spyOn(lessonPlansRepo, 'findLessonPlansByTeacherId').mockResolvedValue(mockPlans as any);
      
      const result = await lessonPlansService.getLessonPlansByTeacherId('teacher-1');
      
      expect(result).toEqual(mockPlans);
    });
  });

  describe('getLessonPlanById', () => {
    it('should return lesson plan when found', async () => {
      const mockPlan = { id: '1', subject: 'Math' };
      vi.spyOn(lessonPlansRepo, 'findLessonPlanById').mockResolvedValue(mockPlan as any);
      
      const result = await lessonPlansService.getLessonPlanById('1');
      
      expect(result).toEqual(mockPlan);
    });

    it('should return null when not found', async () => {
      vi.spyOn(lessonPlansRepo, 'findLessonPlanById').mockResolvedValue(undefined);
      
      const result = await lessonPlansService.getLessonPlanById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createLessonPlan', () => {
    it('should create lesson plan with valid data', async () => {
      const planData = {
        subject: 'Math',
        topic: 'Algebra',
      };
      
      const created = { id: 'new-id', ...planData };
      vi.spyOn(lessonPlansRepo, 'createLessonPlan').mockResolvedValue(created as any);
      
      const result = await lessonPlansService.createLessonPlan(planData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when subject is missing', async () => {
      const planData = {
        topic: 'Algebra',
      };
      
      await expect(lessonPlansService.createLessonPlan(planData as any)).rejects.toThrow('Subject and topic are required');
    });
  });

  describe('updateLessonPlan', () => {
    it('should update lesson plan', async () => {
      const updated = { id: '1', topic: 'Updated Topic' };
      vi.spyOn(lessonPlansRepo, 'updateLessonPlan').mockResolvedValue(updated as any);
      
      const result = await lessonPlansService.updateLessonPlan('1', { topic: 'Updated Topic' });
      
      expect(result?.topic).toBe('Updated Topic');
    });
  });

  describe('deleteLessonPlan', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(lessonPlansRepo, 'deleteLessonPlan').mockResolvedValue(undefined);
      
      const result = await lessonPlansService.deleteLessonPlan('1');
      
      expect(result).toBe(true);
    });
  });
});