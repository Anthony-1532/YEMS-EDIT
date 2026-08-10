import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from './staff-requests.repo.js';
import * as service from './staff-requests.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const baseRequest = {
  id: 'sr1',
  staffId: 'T001',
  staffName: 'Kakashi',
  staffRole: 'teacher',
  type: 'leave' as const,
  title: 'Sick leave',
  details: 'Down with malaria',
  priority: 'normal' as const,
  startDate: '2025-02-10',
  endDate: '2025-02-12',
  amount: null,
  status: 'pending' as const,
  decidedBy: null,
  decidedAt: null,
  decisionReason: null,
  term: 'Second Term',
  session: '2024/2025',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Staff Requests Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create a pending request', async () => {
      vi.spyOn(repo, 'createRequest').mockImplementation(
        async (data: any) => ({ ...baseRequest, ...data }) as any
      );

      const result = await service.createRequest(
        { title: 'Projector for Lab 2', type: 'resource' },
        'T001'
      );

      expect(result.status).toBe('pending');
      expect(result.staffId).toBe('T001');
      expect(result.type).toBe('resource');
    });

    it('should require a title', async () => {
      await expect(
        service.createRequest({ title: '   ' }, 'T001')
      ).rejects.toThrow('title is required');
    });
  });

  describe('updateRequest', () => {
    it('should edit a pending request', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      vi.spyOn(repo, 'updateRequest').mockImplementation(
        async (_id: string, data: any) => ({ ...baseRequest, ...data }) as any
      );

      const result = await service.updateRequest('sr1', { title: 'Updated' });
      expect(result?.title).toBe('Updated');
    });

    it('should refuse edits once decided', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue({ ...baseRequest, status: 'approved' } as any);
      await expect(
        service.updateRequest('sr1', { title: 'Nope' })
      ).rejects.toThrow('already approved');
    });
  });

  describe('approveRequest', () => {
    it('should approve a pending request', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      vi.spyOn(repo, 'updateRequest').mockImplementation(
        async (_id: string, data: any) => ({ ...baseRequest, ...data }) as any
      );

      const result = await service.approveRequest('sr1', 'P001', 'Approved, get well');
      expect(result?.status).toBe('approved');
      expect(result?.decidedBy).toBe('P001');
      expect(result?.decidedAt).toBeInstanceOf(Date);
    });

    it('should refuse to approve an already-decided request', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue({ ...baseRequest, status: 'rejected' } as any);
      await expect(service.approveRequest('sr1', 'P001')).rejects.toThrow('Only pending');
    });
  });

  describe('rejectRequest', () => {
    it('should reject a pending request with a reason', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      vi.spyOn(repo, 'updateRequest').mockImplementation(
        async (_id: string, data: any) => ({ ...baseRequest, ...data }) as any
      );

      const result = await service.rejectRequest('sr1', 'P001', 'Insufficient cover');
      expect(result?.status).toBe('rejected');
      expect(result?.decisionReason).toBe('Insufficient cover');
    });

    it('should require a reason on reject', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      await expect(service.rejectRequest('sr1', 'P001', '  ')).rejects.toThrow('reason is required');
    });
  });

  describe('cancelRequest', () => {
    it('should let the owner cancel a pending request', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      vi.spyOn(repo, 'updateRequest').mockImplementation(
        async (_id: string, data: any) => ({ ...baseRequest, ...data }) as any
      );

      const result = await service.cancelRequest('sr1', 'T001');
      expect(result?.status).toBe('cancelled');
    });

    it('should refuse to cancel someone else\'s request', async () => {
      vi.spyOn(repo, 'findRequestById').mockResolvedValue(baseRequest as any);
      await expect(service.cancelRequest('sr1', 'T999')).rejects.toThrow('your own');
    });
  });

  describe('deleteRequest', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(repo, 'deleteRequest').mockResolvedValue(undefined);
      const result = await service.deleteRequest('sr1');
      expect(result).toBe(true);
    });
  });
});
