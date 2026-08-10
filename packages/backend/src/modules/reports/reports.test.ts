import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as reportsRepo from '../reports/reports.repo.js';
import * as reportsService from '../reports/reports.service.js';

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

describe('Reports Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllReports', () => {
    it('should return all reports for admin', async () => {
      const mockReports = [
        { id: '1', userId: 'user-1', status: 'pending' },
        { id: '2', userId: 'user-2', status: 'resolved' },
      ];
      
      vi.spyOn(reportsRepo, 'findAllReports').mockResolvedValue(mockReports as any);
      
      const result = await reportsService.getAllReports('user-1', 'admin');
      
      expect(result).toEqual(mockReports);
    });

    it('should return only user reports for non-admin', async () => {
      const mockReports = [
        { id: '1', userId: 'user-1', status: 'pending' },
      ];
      
      vi.spyOn(reportsRepo, 'findReportsByUserId').mockResolvedValue(mockReports as any);
      
      const result = await reportsService.getAllReports('user-1', 'student');
      
      expect(result).toEqual(mockReports);
    });
  });

  describe('getUnreadReports', () => {
    it('should return unread reports', async () => {
      const mockReports = [
        { id: '1', read: false },
      ];
      
      vi.spyOn(reportsRepo, 'findUnreadReports').mockResolvedValue(mockReports as any);
      
      const result = await reportsService.getUnreadReports();
      
      expect(result).toEqual(mockReports);
    });
  });

  describe('getReportById', () => {
    it('should return report when found', async () => {
      const mockReport = { id: '1', description: 'Bug report' };
      vi.spyOn(reportsRepo, 'findReportById').mockResolvedValue(mockReport as any);
      
      const result = await reportsService.getReportById('1');
      
      expect(result).toEqual(mockReport);
    });

    it('should return null when not found', async () => {
      vi.spyOn(reportsRepo, 'findReportById').mockResolvedValue(undefined);
      
      const result = await reportsService.getReportById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createReport', () => {
    it('should create report with valid data', async () => {
      const reportData = {
        userId: 'user-1',
        category: 'bug' as const,
        description: 'Found a bug',
      };
      
      const created = { id: 'new-id', ...reportData, status: 'pending' };
      vi.spyOn(reportsRepo, 'createReport').mockResolvedValue(created as any);
      
      const result = await reportsService.createReport(reportData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when description is missing', async () => {
      const reportData = {
        userId: 'user-1',
        category: 'bug' as const,
      };
      
      await expect(reportsService.createReport(reportData as any)).rejects.toThrow('Category and description are required');
    });
  });

  describe('markAsRead', () => {
    it('should mark report as read', async () => {
      const updated = { id: '1', read: true };
      vi.spyOn(reportsRepo, 'markAsRead').mockResolvedValue(updated as any);
      
      const result = await reportsService.markAsRead('1');
      
      expect(result?.read).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update report status', async () => {
      const updated = { id: '1', status: 'in-progress' };
      vi.spyOn(reportsRepo, 'updateStatus').mockResolvedValue(updated as any);
      
      const result = await reportsService.updateStatus('1', 'in-progress');
      
      expect(result?.status).toBe('in-progress');
    });
  });

  describe('resolveReport', () => {
    it('should resolve report', async () => {
      const resolved = { id: '1', status: 'resolved' };
      vi.spyOn(reportsRepo, 'resolveReport').mockResolvedValue(resolved as any);
      
      const result = await reportsService.resolveReport('1');
      
      expect(result?.status).toBe('resolved');
    });
  });

  describe('deleteReport', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(reportsRepo, 'deleteReport').mockResolvedValue(undefined);
      
      const result = await reportsService.deleteReport('1');
      
      expect(result).toBe(true);
    });
  });
});