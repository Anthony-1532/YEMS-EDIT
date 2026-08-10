import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as disciplineRepo from '../discipline/discipline.repo.js';
import * as disciplineService from '../discipline/discipline.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const baseIncident = {
  id: 'inc1',
  studentId: 's1',
  studentName: 'Sasuke',
  class: 'SS2',
  category: 'Fighting',
  severity: 'minor' as const,
  description: 'Pushed another student',
  incidentDate: '2026-05-01',
  status: 'open' as const,
  reportedBy: 'T001',
  reporterName: 'Mr Kakashi',
  escalatedBy: null,
  escalatedAt: null,
  action: 'none' as const,
  actionDetail: null,
  resolutionNote: null,
  resolvedBy: null,
  resolvedAt: null,
  term: 'Second Term',
  session: '2024/2025',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Discipline Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logIncident', () => {
    it('should create an open incident for a minor severity', async () => {
      vi.spyOn(disciplineRepo, 'createIncident').mockImplementation(
        async (data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.logIncident(
        {
          studentId: 's1',
          class: 'SS2',
          category: 'Fighting',
          description: 'Pushed another student',
          severity: 'minor',
        },
        'T001'
      );

      expect(result.status).toBe('open');
      expect(result.escalatedAt).toBeNull();
      expect(result.reportedBy).toBe('T001');
    });

    it('should auto-escalate a serious incident on log', async () => {
      vi.spyOn(disciplineRepo, 'createIncident').mockImplementation(
        async (data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.logIncident(
        {
          studentId: 's1',
          class: 'SS2',
          category: 'Bullying',
          description: 'Repeated bullying',
          severity: 'serious',
        },
        'T001'
      );

      expect(result.status).toBe('escalated');
      expect(result.escalatedBy).toBe('T001');
      expect(result.escalatedAt).toBeInstanceOf(Date);
    });

    it('should require studentId, class, category and description', async () => {
      await expect(
        disciplineService.logIncident(
          { studentId: '', class: '', category: '', description: '' },
          'T001'
        )
      ).rejects.toThrow('studentId, class, category and description are required');
    });
  });

  describe('updateIncident', () => {
    it('should edit an open incident', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue(baseIncident as any);
      vi.spyOn(disciplineRepo, 'updateIncident').mockImplementation(
        async (_id: string, data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.updateIncident('inc1', { severity: 'moderate' });
      expect(result?.severity).toBe('moderate');
    });

    it('should refuse edits once resolved', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'resolved' } as any);
      await expect(
        disciplineService.updateIncident('inc1', { severity: 'severe' })
      ).rejects.toThrow('Cannot edit an incident in "resolved" state');
    });
  });

  describe('escalateIncident', () => {
    it('should escalate an open incident', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue(baseIncident as any);
      vi.spyOn(disciplineRepo, 'updateIncident').mockImplementation(
        async (_id: string, data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.escalateIncident('inc1', 'T001');
      expect(result?.status).toBe('escalated');
      expect(result?.escalatedBy).toBe('T001');
    });

    it('should refuse to escalate an already-escalated incident', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'escalated' } as any);
      await expect(disciplineService.escalateIncident('inc1', 'T001')).rejects.toThrow('Only open incidents');
    });
  });

  describe('resolveIncident', () => {
    it('should resolve an escalated incident with a final action', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'escalated' } as any);
      vi.spyOn(disciplineRepo, 'updateIncident').mockImplementation(
        async (_id: string, data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.resolveIncident('inc1', 'P001', {
        action: 'suspension',
        actionDetail: '3 days',
        note: 'Second offence',
      });
      expect(result?.status).toBe('resolved');
      expect(result?.action).toBe('suspension');
      expect(result?.resolvedBy).toBe('P001');
    });

    it('should require a final action to resolve', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'escalated' } as any);
      await expect(
        disciplineService.resolveIncident('inc1', 'P001', { action: 'none' })
      ).rejects.toThrow('final action');
    });

    it('should refuse to resolve an already-resolved incident', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'resolved' } as any);
      await expect(
        disciplineService.resolveIncident('inc1', 'P001', { action: 'warning' })
      ).rejects.toThrow('already resolved');
    });
  });

  describe('dismissIncident', () => {
    it('should dismiss an incident with a reason', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue({ ...baseIncident, status: 'escalated' } as any);
      vi.spyOn(disciplineRepo, 'updateIncident').mockImplementation(
        async (_id: string, data: any) => ({ ...baseIncident, ...data }) as any
      );

      const result = await disciplineService.dismissIncident('inc1', 'P001', 'No evidence found');
      expect(result?.status).toBe('dismissed');
      expect(result?.resolutionNote).toBe('No evidence found');
    });

    it('should require a reason to dismiss', async () => {
      vi.spyOn(disciplineRepo, 'findIncidentById').mockResolvedValue(baseIncident as any);
      await expect(disciplineService.dismissIncident('inc1', 'P001', '  ')).rejects.toThrow('reason is required');
    });
  });

  describe('deleteIncident', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(disciplineRepo, 'deleteIncident').mockResolvedValue(undefined);
      const result = await disciplineService.deleteIncident('inc1');
      expect(result).toBe(true);
    });
  });
});
