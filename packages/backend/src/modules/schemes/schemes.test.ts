import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as schemesRepo from '../schemes/schemes.repo.js';
import * as schemesService from '../schemes/schemes.service.js';

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

describe('Schemes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSchemes', () => {
    it('should return all schemes', async () => {
      const mockSchemes = [
        { id: '1', subject: 'Math', title: 'Week 1' },
        { id: '2', subject: 'Science', title: 'Week 2' },
      ];
      
      vi.spyOn(schemesRepo, 'findAllSchemes').mockResolvedValue(mockSchemes as any);
      
      const result = await schemesService.getAllSchemes();
      
      expect(result).toEqual(mockSchemes);
    });
  });

  describe('getSchemesBySubject', () => {
    it('should return schemes for specific subject', async () => {
      const mockSchemes = [
        { id: '1', subject: 'Math', title: 'Week 1' },
      ];
      
      vi.spyOn(schemesRepo, 'findSchemesBySubject').mockResolvedValue(mockSchemes as any);
      
      const result = await schemesService.getSchemesBySubject('Math');
      
      expect(result).toEqual(mockSchemes);
    });
  });

  describe('getSchemesByClass', () => {
    it('should return schemes for specific class', async () => {
      const mockSchemes = [
        { id: '1', class: 'JSS1', title: 'Week 1' },
      ];
      
      vi.spyOn(schemesRepo, 'findSchemesByClass').mockResolvedValue(mockSchemes as any);
      
      const result = await schemesService.getSchemesByClass('JSS1');
      
      expect(result).toEqual(mockSchemes);
    });
  });

  describe('getSchemeById', () => {
    it('should return scheme when found', async () => {
      const mockScheme = { id: '1', subject: 'Math' };
      vi.spyOn(schemesRepo, 'findSchemeById').mockResolvedValue(mockScheme as any);
      
      const result = await schemesService.getSchemeById('1');
      
      expect(result).toEqual(mockScheme);
    });

    it('should return null when not found', async () => {
      vi.spyOn(schemesRepo, 'findSchemeById').mockResolvedValue(undefined);
      
      const result = await schemesService.getSchemeById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createScheme', () => {
    it('should create scheme with valid data', async () => {
      const schemeData = {
        subject: 'Math',
        title: 'Week 1 Scheme',
      };
      
      const created = { id: 'new-id', ...schemeData };
      vi.spyOn(schemesRepo, 'createScheme').mockResolvedValue(created as any);
      
      const result = await schemesService.createScheme(schemeData);
      
      expect(result).toHaveProperty('id');
    });

    it('should throw error when subject is missing', async () => {
      const schemeData = {
        title: 'Week 1 Scheme',
      };
      
      await expect(schemesService.createScheme(schemeData as any)).rejects.toThrow('Subject and title are required');
    });
  });

  describe('updateScheme', () => {
    it('should update scheme', async () => {
      const updated = { id: '1', title: 'Updated Title' };
      vi.spyOn(schemesRepo, 'updateScheme').mockResolvedValue(updated as any);
      
      const result = await schemesService.updateScheme('1', { title: 'Updated Title' });
      
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('deleteScheme', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(schemesRepo, 'deleteScheme').mockResolvedValue(undefined);
      
      const result = await schemesService.deleteScheme('1');
      
      expect(result).toBe(true);
    });
  });
});