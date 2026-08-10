import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as submissionsRepo from '../submissions/submissions.repo.js';
import * as submissionsService from '../submissions/submissions.service.js';
import { db } from '../../config/db.js';

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

describe('Submissions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSubmissions', () => {
    it('should return all submissions for admin/teacher', async () => {
      const mockSubmissions = [
        { id: '1', examId: 'exam-1', studentId: 'student-1' },
        { id: '2', examId: 'exam-2', studentId: 'student-2' },
      ];
      
      vi.spyOn(submissionsRepo, 'findAllSubmissions').mockResolvedValue(mockSubmissions as any);
      
      const result = await submissionsService.getAllSubmissions('user-1', 'teacher');
      
      expect(result).toEqual(mockSubmissions);
    });

    it('should return only student submissions for student', async () => {
      const mockSubmissions = [
        { id: '1', examId: 'exam-1', studentId: 'student-1' },
      ];
      
      vi.spyOn(submissionsRepo, 'findSubmissionsByStudentId').mockResolvedValue(mockSubmissions as any);
      
      const result = await submissionsService.getAllSubmissions('student-1', 'student');
      
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getSubmissionsByExamId', () => {
    it('should return submissions for specific exam', async () => {
      const mockSubmissions = [
        { id: '1', examId: 'exam-1', studentId: 'student-1' },
      ];
      
      vi.spyOn(submissionsRepo, 'findSubmissionsByExamId').mockResolvedValue(mockSubmissions as any);
      
      const result = await submissionsService.getSubmissionsByExamId('exam-1');
      
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getSubmissionsByStudentId', () => {
    it('should return submissions for specific student', async () => {
      const mockSubmissions = [
        { id: '1', studentId: 'student-1', examId: 'exam-1' },
      ];
      
      vi.spyOn(submissionsRepo, 'findSubmissionsByStudentId').mockResolvedValue(mockSubmissions as any);
      
      const result = await submissionsService.getSubmissionsByStudentId('student-1');
      
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getSubmissionById', () => {
    it('should return submission when found', async () => {
      const mockSubmission = { id: '1', examId: 'exam-1' };
      vi.spyOn(submissionsRepo, 'findSubmissionById').mockResolvedValue(mockSubmission as any);
      
      const result = await submissionsService.getSubmissionById('1');
      
      expect(result).toEqual(mockSubmission);
    });

    it('should return null when not found', async () => {
      vi.spyOn(submissionsRepo, 'findSubmissionById').mockResolvedValue(undefined);
      
      const result = await submissionsService.getSubmissionById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('getSubmissionDetails', () => {
    it('should include student context for teacher review', async () => {
      vi.spyOn(submissionsRepo, 'findSubmissionById').mockResolvedValue({ id: '1', examId: 'exam-1', studentId: 'student-1' } as any);
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'student-1', name: 'Ada', class: 'SS2A' }]),
          }),
        }),
      } as any);

      const result = await submissionsService.getSubmissionDetails('1');

      expect(result?.studentName).toBe('Ada');
      expect(result?.studentClass).toBe('SS2A');
    });
  });

  describe('createSubmission', () => {
    it('should create submission with valid data', async () => {
      const submissionData = {
        examId: 'exam-1',
        studentId: 'student-1',
        answers: { q1: 'A', q2: 'B' },
      };
      
      const created = { id: 'new-id', ...submissionData };
      vi.spyOn(submissionsRepo, 'createSubmissionIfNotExists').mockResolvedValue(created as any);
      
      const result = await submissionsService.createSubmission(submissionData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw conflict when submission already exists', async () => {
      const submissionData = {
        examId: 'exam-1',
        studentId: 'student-1',
        answers: { q1: 'A', q2: 'B' },
      };

      vi.spyOn(submissionsRepo, 'createSubmissionIfNotExists').mockResolvedValue(null);

      await expect(submissionsService.createSubmission(submissionData)).rejects.toThrow(
        'Submission already exists for this exam and student'
      );
    });

    it('should throw error when examId is missing', async () => {
      const submissionData = {
        studentId: 'student-1',
        answers: { q1: 'A' },
      };
      
      await expect(submissionsService.createSubmission(submissionData as any)).rejects.toThrow('Exam ID, student ID, and answers are required');
    });
  });

  describe('gradeSubmission', () => {
    it('should grade submission', async () => {
      const graded = { id: '1', score: 85, totalScore: 100 };
      vi.spyOn(submissionsRepo, 'gradeSubmission').mockResolvedValue(graded as any);
      
      const result = await submissionsService.gradeSubmission('1', {
        score: 85,
        totalScore: 100,
        gradedBy: 'teacher-1',
      });
      
      expect(result?.score).toBe(85);
    });
  });

  describe('updateSubmission', () => {
    it('should update submission answers', async () => {
      const updated = { id: '1', answers: { q1: 'C' } };
      vi.spyOn(submissionsRepo, 'updateSubmission').mockResolvedValue(updated as any);
      
      const result = await submissionsService.updateSubmission('1', { answers: { q1: 'C' } });
      
      expect(result?.answers).toEqual({ q1: 'C' });
    });
  });

  describe('deleteSubmission', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(submissionsRepo, 'deleteSubmission').mockResolvedValue(undefined);
      
      const result = await submissionsService.deleteSubmission('1');
      
      expect(result).toBe(true);
    });
  });
});