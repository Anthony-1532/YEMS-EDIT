import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as resultsRepo from '../results/results.repo.js';
import * as resultsService from '../results/results.service.js';

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

describe('Results Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllResults', () => {
    it('should return all results for admin/teacher', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', score: 85 },
        { id: '2', studentId: 'student-2', score: 90 },
      ];
      
      vi.spyOn(resultsRepo, 'findAllResults').mockResolvedValue(mockResults as any);
      
      const result = await resultsService.getAllResults('user-1', 'teacher');
      
      expect(result).toEqual(mockResults);
    });

    it('should return only student results for student', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', score: 85 },
      ];
      
      vi.spyOn(resultsRepo, 'findResultsByStudentId').mockResolvedValue(mockResults as any);
      
      const result = await resultsService.getAllResults('student-1', 'student');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe('getResultsByStudentId', () => {
    it('should return results for specific student', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', subject: 'Math' },
      ];
      
      vi.spyOn(resultsRepo, 'findResultsByStudentId').mockResolvedValue(mockResults as any);
      
      const result = await resultsService.getResultsByStudentId('student-1');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe('getResultById', () => {
    it('should return result when found', async () => {
      const mockResult = { id: '1', score: 85 };
      vi.spyOn(resultsRepo, 'findResultById').mockResolvedValue(mockResult as any);
      
      const result = await resultsService.getResultById('1');
      
      expect(result).toEqual(mockResult);
    });

    it('should return null when not found', async () => {
      vi.spyOn(resultsRepo, 'findResultById').mockResolvedValue(undefined);
      
      const result = await resultsService.getResultById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createResult', () => {
    it('should create result with valid data', async () => {
      const resultData = {
        studentId: 'student-1',
        subject: 'Math',
        score: 85,
        totalScore: 100,
      };
      
      const created = { id: 'new-id', ...resultData };
      vi.spyOn(resultsRepo, 'createResult').mockResolvedValue(created as any);
      
      const result = await resultsService.createResult(resultData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when studentId is missing', async () => {
      const resultData = {
        subject: 'Math',
        score: 85,
        totalScore: 100,
      };
      
      await expect(resultsService.createResult(resultData as any)).rejects.toThrow('Student ID, subject, and score are required');
    });
  });

  describe('updateResult', () => {
    it('should update result', async () => {
      const updated = { id: '1', score: 90 };
      vi.spyOn(resultsRepo, 'updateResult').mockResolvedValue(updated as any);
      
      const result = await resultsService.updateResult('1', { score: 90 });
      
      expect(result?.score).toBe(90);
    });
  });

  describe('deleteResult', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(resultsRepo, 'deleteResult').mockResolvedValue(undefined);
      
      const result = await resultsService.deleteResult('1');
      
      expect(result).toBe(true);
    });
  });
});