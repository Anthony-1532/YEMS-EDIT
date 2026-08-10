import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as examsRepo from '../exams/exams.repo.js';
import * as examsService from '../exams/exams.service.js';

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

describe('Exams Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllExams', () => {
    it('should return all exams with filters', async () => {
      const mockExams = [
        { id: '1', title: 'Math Quiz', type: 'quiz', createdBy: 'teacher-1' },
        { id: '2', title: 'Science Midterm', type: 'midterm', createdBy: 'teacher-1' },
      ];
      
      vi.spyOn(examsRepo, 'findAllExams').mockResolvedValue(mockExams as any);
      
      const result = await examsService.getAllExams({ limit: 10, offset: 0 });
      
      expect(result).toEqual(mockExams);
      expect(examsRepo.findAllExams).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });

    it('should filter exams by type', async () => {
      const mockExams = [
        { id: '1', title: 'Math Quiz', type: 'quiz' },
      ];
      
      vi.spyOn(examsRepo, 'findAllExams').mockResolvedValue(mockExams as any);
      
      const result = await examsService.getAllExams({ type: 'quiz' });
      
      expect(result[0].type).toBe('quiz');
    });

    it('should filter exams by creator', async () => {
      const mockExams = [
        { id: '1', title: 'Math Quiz', createdBy: 'teacher-1' },
      ];
      
      vi.spyOn(examsRepo, 'findAllExams').mockResolvedValue(mockExams as any);
      
      const result = await examsService.getAllExams({ createdBy: 'teacher-1' });
      
      expect(result[0].createdBy).toBe('teacher-1');
    });
  });

  describe('getExamById', () => {
    it('should return exam when found', async () => {
      const mockExam = { id: '1', title: 'Math Quiz', type: 'quiz' };
      vi.spyOn(examsRepo, 'findExamById').mockResolvedValue(mockExam as any);
      
      const result = await examsService.getExamById('1');
      
      expect(result).toEqual(mockExam);
    });

    it('should return null when not found', async () => {
      vi.spyOn(examsRepo, 'findExamById').mockResolvedValue(undefined);
      
      const result = await examsService.getExamById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createExam', () => {
    it('should create exam with valid data', async () => {
      const examData = {
        title: 'New Exam',
        type: 'quiz' as const,
        description: 'Test exam',
        createdBy: 'teacher-1',
      };
      
      const createdExam = { id: 'new-id', ...examData };
      vi.spyOn(examsRepo, 'createExam').mockResolvedValue(createdExam as any);
      
      const result = await examsService.createExam(examData);
      
      expect(result).toHaveProperty('id');
      expect(result.title).toBe('New Exam');
    });
  });

  describe('updateExam', () => {
    it('should update exam with valid data', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedExam = { id: '1', title: 'Updated Title', type: 'quiz' };
      vi.spyOn(examsRepo, 'updateExam').mockResolvedValue(updatedExam as any);
      
      const result = await examsService.updateExam('1', updateData);
      
      expect(result?.title).toBe('Updated Title');
    });

    it('should return null when exam not found', async () => {
      vi.spyOn(examsRepo, 'updateExam').mockResolvedValue(undefined);
      
      const result = await examsService.updateExam('999', { title: 'Test' });
      
      expect(result).toBeNull();
    });
  });

  describe('deleteExam', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(examsRepo, 'deleteExam').mockResolvedValue(undefined);
      
      const result = await examsService.deleteExam('1');
      
      expect(result).toBe(true);
    });
  });
});