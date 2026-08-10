import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as midtermResultsRepo from '../midterm-results/midterm-results.repo.js';
import * as midtermResultsService from '../midterm-results/midterm-results.service.js';

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

describe('Midterm Results Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllMidtermResults', () => {
    it('should return all results for admin/teacher', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', subject: 'Math' },
        { id: '2', studentId: 'student-2', subject: 'Science' },
      ];
      
      vi.spyOn(midtermResultsRepo, 'findAllMidtermResults').mockResolvedValue(mockResults as any);
      
      const result = await midtermResultsService.getAllMidtermResults('user-1', 'teacher');
      
      expect(result).toEqual(mockResults);
    });

    it('should return only student results for student', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', subject: 'Math' },
      ];
      
      vi.spyOn(midtermResultsRepo, 'findMidtermResultsByStudentId').mockResolvedValue(mockResults as any);
      
      const result = await midtermResultsService.getAllMidtermResults('student-1', 'student');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe('getMidtermResultsByStudentId', () => {
    it('should return results for specific student', async () => {
      const mockResults = [
        { id: '1', studentId: 'student-1', subject: 'Math' },
      ];
      
      vi.spyOn(midtermResultsRepo, 'findMidtermResultsByStudentId').mockResolvedValue(mockResults as any);
      
      const result = await midtermResultsService.getMidtermResultsByStudentId('student-1');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe('getMidtermResultsByClass', () => {
    it('should return results for specific class', async () => {
      const mockResults = [
        { id: '1', class: 'JSS1', subject: 'Math' },
      ];
      
      vi.spyOn(midtermResultsRepo, 'findMidtermResultsByClass').mockResolvedValue(mockResults as any);
      
      const result = await midtermResultsService.getMidtermResultsByClass('JSS1');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe('getMidtermResultById', () => {
    it('should return result when found', async () => {
      const mockResult = { id: '1', subject: 'Math' };
      vi.spyOn(midtermResultsRepo, 'findMidtermResultById').mockResolvedValue(mockResult as any);
      
      const result = await midtermResultsService.getMidtermResultById('1');
      
      expect(result).toEqual(mockResult);
    });

    it('should return null when not found', async () => {
      vi.spyOn(midtermResultsRepo, 'findMidtermResultById').mockResolvedValue(undefined);
      
      const result = await midtermResultsService.getMidtermResultById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createMidtermResult', () => {
    it('should create midterm result with valid data', async () => {
      const resultData = {
        studentId: 'student-1',
        class: 'JSS1',
        subject: 'Math',
      };
      
      const created = { id: 'new-id', ...resultData };
      vi.spyOn(midtermResultsRepo, 'createMidtermResult').mockResolvedValue(created as any);
      
      const result = await midtermResultsService.createMidtermResult(resultData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when studentId is missing', async () => {
      const resultData = {
        class: 'JSS1',
        subject: 'Math',
      };
      
      await expect(midtermResultsService.createMidtermResult(resultData as any)).rejects.toThrow('Student ID, class, and subject are required');
    });
  });

  describe('updateMidtermResult', () => {
    it('should update midterm result', async () => {
      const updated = { id: '1', totalScore: 90 };
      vi.spyOn(midtermResultsRepo, 'updateMidtermResult').mockResolvedValue(updated as any);
      
      const result = await midtermResultsService.updateMidtermResult('1', { totalScore: 90 });
      
      expect(result?.totalScore).toBe(90);
    });
  });

  describe('deleteMidtermResult', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(midtermResultsRepo, 'deleteMidtermResult').mockResolvedValue(undefined);
      
      const result = await midtermResultsService.deleteMidtermResult('1');
      
      expect(result).toBe(true);
    });
  });
});