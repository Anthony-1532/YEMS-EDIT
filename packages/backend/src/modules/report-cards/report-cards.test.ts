import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as reportCardsRepo from '../report-cards/report-cards.repo.js';
import * as reportCardsService from '../report-cards/report-cards.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const baseCard = {
  id: 'rc1',
  studentId: 's1',
  studentName: 'Naruto',
  class: 'SS3',
  term: 'Second Term',
  session: '2024/2025',
  status: 'draft' as const,
  subjects: [{ subject: 'Math', totalScore: 80, grade: 'A' }],
  overallTotal: 80,
  overallAverage: 80,
  position: null,
  attendanceSummary: null,
  classTeacherRemark: null,
  principalComment: null,
  compiledBy: 'T001',
  submittedAt: null,
  reviewedBy: null,
  reviewedAt: null,
  sentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Report Cards Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compileReportCard', () => {
    it('should create a draft with computed totals', async () => {
      vi.spyOn(reportCardsRepo, 'findAllReportCards').mockResolvedValue([]);
      vi.spyOn(reportCardsRepo, 'createReportCard').mockImplementation(
        async (data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.compileReportCard(
        {
          studentId: 's1',
          class: 'SS3',
          term: 'Second Term',
          session: '2024/2025',
          subjects: [
            { subject: 'Math', totalScore: 80 },
            { subject: 'English', totalScore: 60 },
          ],
        },
        'T001'
      );

      expect(result.status).toBe('draft');
      expect(result.overallTotal).toBe(140);
      expect(result.overallAverage).toBe(70);
      expect(result.compiledBy).toBe('T001');
    });

    it('should require studentId, class, term and session', async () => {
      await expect(
        reportCardsService.compileReportCard(
          { studentId: '', class: '', term: '', session: '' },
          'T001'
        )
      ).rejects.toThrow('studentId, class, term and session are required');
    });

    it('should reject a duplicate for the same student/term/session', async () => {
      vi.spyOn(reportCardsRepo, 'findAllReportCards').mockResolvedValue([baseCard] as any);
      await expect(
        reportCardsService.compileReportCard(
          { studentId: 's1', class: 'SS3', term: 'Second Term', session: '2024/2025' },
          'T001'
        )
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateReportCard', () => {
    it('should recompute totals when subjects change', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue(baseCard as any);
      vi.spyOn(reportCardsRepo, 'updateReportCard').mockImplementation(
        async (_id: string, data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.updateReportCard('rc1', {
        subjects: [{ subject: 'Math', totalScore: 90 }, { subject: 'Bio', totalScore: 70 }],
      });

      expect(result?.overallTotal).toBe(160);
      expect(result?.overallAverage).toBe(80);
    });

    it('should refuse edits once submitted', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'submitted' } as any);
      await expect(
        reportCardsService.updateReportCard('rc1', { position: '1st' })
      ).rejects.toThrow('Cannot edit a report card in "submitted" state');
    });
  });

  describe('submitReportCard', () => {
    it('should move a draft to submitted', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue(baseCard as any);
      vi.spyOn(reportCardsRepo, 'updateReportCard').mockImplementation(
        async (_id: string, data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.submitReportCard('rc1');
      expect(result?.status).toBe('submitted');
      expect(result?.submittedAt).toBeInstanceOf(Date);
    });

    it('should reject submitting an empty card', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, subjects: [] } as any);
      await expect(reportCardsService.submitReportCard('rc1')).rejects.toThrow('no subject scores');
    });

    it('should reject submitting an already-approved card', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'principal_approved' } as any);
      await expect(reportCardsService.submitReportCard('rc1')).rejects.toThrow('draft or returned');
    });
  });

  describe('approveReportCard', () => {
    it('should approve a submitted card', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'submitted' } as any);
      vi.spyOn(reportCardsRepo, 'updateReportCard').mockImplementation(
        async (_id: string, data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.approveReportCard('rc1', 'P001', 'Well done');
      expect(result?.status).toBe('principal_approved');
      expect(result?.reviewedBy).toBe('P001');
    });

    it('should refuse to approve a draft', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue(baseCard as any);
      await expect(reportCardsService.approveReportCard('rc1', 'P001')).rejects.toThrow('Only submitted');
    });
  });

  describe('returnReportCard', () => {
    it('should return a submitted card with a comment', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'submitted' } as any);
      vi.spyOn(reportCardsRepo, 'updateReportCard').mockImplementation(
        async (_id: string, data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.returnReportCard('rc1', 'P001', 'Fix the Maths score');
      expect(result?.status).toBe('returned');
      expect(result?.principalComment).toBe('Fix the Maths score');
    });

    it('should require a comment on return', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'submitted' } as any);
      await expect(reportCardsService.returnReportCard('rc1', 'P001', '  ')).rejects.toThrow('comment is required');
    });
  });

  describe('sendReportCard', () => {
    it('should send an approved card', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'principal_approved' } as any);
      vi.spyOn(reportCardsRepo, 'updateReportCard').mockImplementation(
        async (_id: string, data: any) => ({ ...baseCard, ...data }) as any
      );

      const result = await reportCardsService.sendReportCard('rc1');
      expect(result?.status).toBe('sent');
      expect(result?.sentAt).toBeInstanceOf(Date);
    });

    it('should refuse to send a card that is not approved', async () => {
      vi.spyOn(reportCardsRepo, 'findReportCardById').mockResolvedValue({ ...baseCard, status: 'submitted' } as any);
      await expect(reportCardsService.sendReportCard('rc1')).rejects.toThrow('principal-approved');
    });
  });

  describe('deleteReportCard', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(reportCardsRepo, 'deleteReportCard').mockResolvedValue(undefined);
      const result = await reportCardsService.deleteReportCard('rc1');
      expect(result).toBe(true);
    });
  });
});
