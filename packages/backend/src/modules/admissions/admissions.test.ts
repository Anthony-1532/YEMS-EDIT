import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admissionsRepo from '../admissions/admissions.repo.js';
import * as admissionsService from '../admissions/admissions.service.js';

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

describe('Admissions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAdmissions', () => {
    it('should return all admissions with filters', async () => {
      const mockAdmissions = [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'pending' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'approved' },
      ];
      
      vi.spyOn(admissionsRepo, 'findAllAdmissions').mockResolvedValue(mockAdmissions as any);
      
      const result = await admissionsService.getAllAdmissions({ limit: 10, offset: 0 });
      
      expect(result).toEqual(mockAdmissions);
    });

    it('should filter by status', async () => {
      const mockAdmissions = [
        { id: '1', firstName: 'John', status: 'pending' },
      ];
      
      vi.spyOn(admissionsRepo, 'findAllAdmissions').mockResolvedValue(mockAdmissions as any);
      
      const result = await admissionsService.getAllAdmissions({ status: 'pending' });
      
      expect(result[0].status).toBe('pending');
    });
  });

  describe('getAdmissionsByUserId', () => {
    it('should return admissions for specific user', async () => {
      const mockAdmissions = [
        { id: 'user-1', firstName: 'John' },
      ];
      
      vi.spyOn(admissionsRepo, 'findAdmissionsByUserId').mockResolvedValue(mockAdmissions as any);
      
      const result = await admissionsService.getAdmissionsByUserId('user-1');
      
      expect(result).toEqual(mockAdmissions);
    });
  });

  describe('getPendingAdmissions', () => {
    it('should return only pending admissions', async () => {
      const mockAdmissions = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];
      
      vi.spyOn(admissionsRepo, 'findPendingAdmissions').mockResolvedValue(mockAdmissions as any);
      
      const result = await admissionsService.getPendingAdmissions();
      
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('getAdmissionById', () => {
    it('should return admission when found', async () => {
      const mockAdmission = { id: '1', firstName: 'John', lastName: 'Doe' };
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue(mockAdmission as any);
      
      const result = await admissionsService.getAdmissionById('1');
      
      expect(result).toEqual(mockAdmission);
    });

    it('should return null when not found', async () => {
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue(undefined);
      
      const result = await admissionsService.getAdmissionById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createAdmission', () => {
    it('should create admission with valid data', async () => {
      const admissionData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      
      const createdAdmission = { id: 'new-id', ...admissionData, status: 'pending' };
      vi.spyOn(admissionsRepo, 'createAdmission').mockResolvedValue(createdAdmission as any);
      
      const result = await admissionsService.createAdmission(admissionData);
      
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
    });

    it('should throw error when firstName is missing', async () => {
      const admissionData = {
        lastName: 'Doe',
      };
      
      await expect(admissionsService.createAdmission(admissionData as any)).rejects.toThrow('First name and last name are required');
    });
  });

  describe('updateAdmission', () => {
    it('should update admission', async () => {
      const updateData = { email: 'newemail@example.com' };
      const updatedAdmission = { id: '1', email: 'newemail@example.com' };
      vi.spyOn(admissionsRepo, 'updateAdmission').mockResolvedValue(updatedAdmission as any);
      
      const result = await admissionsService.updateAdmission('1', updateData);
      
      expect(result?.email).toBe('newemail@example.com');
    });
  });

  describe('approveAdmission', () => {
    it('should approve admission', async () => {
      const approved = { id: '1', status: 'approved' };
      vi.spyOn(admissionsRepo, 'approveAdmission').mockResolvedValue(approved as any);
      
      const result = await admissionsService.approveAdmission('1');
      
      expect(result?.status).toBe('approved');
    });
  });

  describe('rejectAdmission', () => {
    it('should reject admission', async () => {
      const rejected = { id: '1', status: 'rejected' };
      vi.spyOn(admissionsRepo, 'rejectAdmission').mockResolvedValue(rejected as any);
      
      const result = await admissionsService.rejectAdmission('1');
      
      expect(result?.status).toBe('rejected');
    });
  });

  describe('deleteAdmission', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(admissionsRepo, 'deleteAdmission').mockResolvedValue(undefined);

      const result = await admissionsService.deleteAdmission('1');

      expect(result).toBe(true);
    });
  });

  describe('waitlistAdmission', () => {
    it('should append a pending application to the end of the waitlist', async () => {
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue({ id: '1', status: 'pending' } as any);
      vi.spyOn(admissionsRepo, 'findWaitlist').mockResolvedValue([
        { id: 'a', status: 'waitlisted', waitlistRank: 1 },
        { id: 'b', status: 'waitlisted', waitlistRank: 2 },
      ] as any);
      vi.spyOn(admissionsRepo, 'waitlistAdmission').mockImplementation(
        async (id: string, data: any) => ({ id, status: 'waitlisted', ...data }) as any
      );

      const result = await admissionsService.waitlistAdmission('1', { decidedBy: 'P001' });

      expect(result?.status).toBe('waitlisted');
      expect(result?.waitlistRank).toBe(3);
    });

    it('should refuse to waitlist a non-pending application', async () => {
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue({ id: '1', status: 'approved' } as any);
      await expect(admissionsService.waitlistAdmission('1')).rejects.toThrow('Only pending');
    });
  });

  describe('rankWaitlist', () => {
    it('should reassign ranks 1..N in the given order', async () => {
      vi.spyOn(admissionsRepo, 'findWaitlist').mockResolvedValue([
        { id: 'a', status: 'waitlisted', waitlistRank: 1 },
        { id: 'b', status: 'waitlisted', waitlistRank: 2 },
      ] as any);
      vi.spyOn(admissionsRepo, 'setWaitlistRank').mockImplementation(
        async (id: string, rank: number) => ({ id, waitlistRank: rank }) as any
      );

      const result = await admissionsService.rankWaitlist(['b', 'a']);

      expect(result[0]).toMatchObject({ id: 'b', waitlistRank: 1 });
      expect(result[1]).toMatchObject({ id: 'a', waitlistRank: 2 });
    });

    it('should reject an incomplete ordering', async () => {
      vi.spyOn(admissionsRepo, 'findWaitlist').mockResolvedValue([
        { id: 'a', status: 'waitlisted', waitlistRank: 1 },
        { id: 'b', status: 'waitlisted', waitlistRank: 2 },
      ] as any);
      await expect(admissionsService.rankWaitlist(['a'])).rejects.toThrow('every waitlisted');
    });

    it('should reject duplicate ids', async () => {
      await expect(admissionsService.rankWaitlist(['a', 'a'])).rejects.toThrow('duplicate');
    });
  });

  describe('promoteFromWaitlist', () => {
    it('should promote a waitlisted application to approved', async () => {
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue({ id: '1', status: 'waitlisted' } as any);
      vi.spyOn(admissionsRepo, 'approveAdmission').mockImplementation(
        async (id: string, patch: any) => ({ id, status: 'approved', ...patch }) as any
      );

      const result = await admissionsService.promoteFromWaitlist('1', { decidedBy: 'P001' });

      expect(result?.status).toBe('approved');
    });

    it('should refuse to promote a non-waitlisted application', async () => {
      vi.spyOn(admissionsRepo, 'findAdmissionById').mockResolvedValue({ id: '1', status: 'pending' } as any);
      await expect(admissionsService.promoteFromWaitlist('1')).rejects.toThrow('Only waitlisted');
    });
  });
});