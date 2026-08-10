import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from './expenses.repo.js';
import * as service from './expenses.service.js';
import { DEFAULT_APPROVAL_THRESHOLD } from './expenses.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const baseExpense = {
  id: 'e1',
  category: 'Utilities',
  title: 'Diesel for generator',
  description: null,
  amount: 50000,
  vendor: 'Total Energies',
  expenseDate: '2025-02-10',
  status: 'pending' as const,
  requiresApproval: 1,
  recordedBy: 'A001',
  recordedByName: 'Iruka',
  decidedBy: null,
  decidedAt: null,
  decisionReason: null,
  term: 'Second Term',
  session: '2024/2025',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Expenses Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExpense', () => {
    it('auto-approves an expense below the threshold', async () => {
      vi.spyOn(repo, 'createExpense').mockImplementation(
        async (data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.createExpense(
        { category: 'Stationery', title: 'Chalk', amount: 5000, expenseDate: '2025-02-10' },
        'A001',
        'Iruka'
      );

      expect(result.status).toBe('approved');
      expect(result.requiresApproval).toBe(0);
      expect(result.decidedBy).toBe('A001');
      expect(result.decisionReason).toContain('Auto-approved');
    });

    it('holds an at-threshold expense for sign-off', async () => {
      vi.spyOn(repo, 'createExpense').mockImplementation(
        async (data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.createExpense(
        { category: 'Repairs', title: 'Roof', amount: DEFAULT_APPROVAL_THRESHOLD, expenseDate: '2025-02-10' },
        'A001',
        'Iruka'
      );

      expect(result.status).toBe('pending');
      expect(result.requiresApproval).toBe(1);
      expect(result.decidedBy).toBeNull();
    });

    it('honours a custom approval threshold', async () => {
      vi.spyOn(repo, 'createExpense').mockImplementation(
        async (data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.createExpense(
        { category: 'Repairs', title: 'Fan', amount: 5000, expenseDate: '2025-02-10', approvalThreshold: 1000 },
        'A001'
      );

      expect(result.status).toBe('pending');
    });

    it('requires a positive amount', async () => {
      await expect(
        service.createExpense(
          { category: 'Repairs', title: 'Fan', amount: 0, expenseDate: '2025-02-10' },
          'A001'
        )
      ).rejects.toThrow('amount must be a positive number');
    });

    it('requires a title', async () => {
      await expect(
        service.createExpense(
          { category: 'Repairs', title: '  ', amount: 5000, expenseDate: '2025-02-10' },
          'A001'
        )
      ).rejects.toThrow('title is required');
    });

    it('requires a category', async () => {
      await expect(
        service.createExpense(
          { title: 'Fan', amount: 5000, expenseDate: '2025-02-10' },
          'A001'
        )
      ).rejects.toThrow('category is required');
    });

    it('requires an expense date', async () => {
      await expect(
        service.createExpense(
          { category: 'Repairs', title: 'Fan', amount: 5000 },
          'A001'
        )
      ).rejects.toThrow('expenseDate is required');
    });
  });

  describe('updateExpense', () => {
    it('edits a pending expense', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue(baseExpense as any);
      vi.spyOn(repo, 'updateExpense').mockImplementation(
        async (_id: string, data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.updateExpense('e1', { amount: 60000 });
      expect(result?.amount).toBe(60000);
    });

    it('refuses edits once decided', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue({ ...baseExpense, status: 'approved' } as any);
      await expect(
        service.updateExpense('e1', { amount: 60000 })
      ).rejects.toThrow('already approved');
    });
  });

  describe('approveExpense', () => {
    it('approves a pending expense', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue(baseExpense as any);
      vi.spyOn(repo, 'updateExpense').mockImplementation(
        async (_id: string, data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.approveExpense('e1', 'P001', 'Cleared');
      expect(result?.status).toBe('approved');
      expect(result?.decidedBy).toBe('P001');
      expect(result?.decidedAt).toBeInstanceOf(Date);
    });

    it('refuses to approve an already-decided expense', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue({ ...baseExpense, status: 'rejected' } as any);
      await expect(service.approveExpense('e1', 'P001')).rejects.toThrow('Only pending');
    });
  });

  describe('rejectExpense', () => {
    it('rejects a pending expense with a reason', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue(baseExpense as any);
      vi.spyOn(repo, 'updateExpense').mockImplementation(
        async (_id: string, data: any) => ({ ...baseExpense, ...data }) as any
      );

      const result = await service.rejectExpense('e1', 'P001', 'Over budget');
      expect(result?.status).toBe('rejected');
      expect(result?.decisionReason).toBe('Over budget');
    });

    it('requires a reason on reject', async () => {
      vi.spyOn(repo, 'findExpenseById').mockResolvedValue(baseExpense as any);
      await expect(service.rejectExpense('e1', 'P001', '  ')).rejects.toThrow('reason is required');
    });
  });

  describe('summarizeExpenses', () => {
    it('aggregates totals and per-category approved spend', async () => {
      vi.spyOn(repo, 'findAllExpenses').mockResolvedValue([
        { ...baseExpense, status: 'approved', category: 'Utilities', amount: 50000 },
        { ...baseExpense, status: 'approved', category: 'Utilities', amount: 30000 },
        { ...baseExpense, status: 'approved', category: 'Repairs', amount: 20000 },
        { ...baseExpense, status: 'pending', amount: 150000 },
        { ...baseExpense, status: 'rejected', amount: 9000 },
      ] as any);

      const result = await service.summarizeExpenses();

      expect(result.totalApproved).toBe(100000);
      expect(result.totalPending).toBe(150000);
      expect(result.totalRejected).toBe(9000);
      expect(result.pendingCount).toBe(1);
      expect(result.byCategory.Utilities).toBe(80000);
      expect(result.byCategory.Repairs).toBe(20000);
    });
  });

  describe('deleteExpense', () => {
    it('returns true after deletion', async () => {
      vi.spyOn(repo, 'deleteExpense').mockResolvedValue(undefined);
      const result = await service.deleteExpense('e1');
      expect(result).toBe(true);
    });
  });
});
