import * as repo from './expenses.repo.js';
import type { ExpenseFilters } from './expenses.repo.js';
import type { Expense, NewExpense } from '../../db/schema/expenses.js';
import { generateId } from '../../shared/utils/auth.utils.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

// Expenses at or above this amount are held for principal sign-off. Anything
// below is auto-approved so the accountant can process routine spend directly.
export const DEFAULT_APPROVAL_THRESHOLD = 100000;

export interface CreateExpenseInput {
  category?: string;
  title?: string;
  description?: string;
  amount?: number;
  vendor?: string;
  expenseDate?: string;
  term?: string;
  session?: string;
  approvalThreshold?: number;
}

export interface UpdateExpenseInput {
  category?: string;
  title?: string;
  description?: string;
  amount?: number;
  vendor?: string;
  expenseDate?: string;
  term?: string;
  session?: string;
}

export async function listExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  return repo.findAllExpenses(filters);
}

export async function getExpense(id: string): Promise<Expense> {
  const expense = await repo.findExpenseById(id);
  if (!expense) throw new NotFoundError('Expense not found');
  return expense;
}

export async function createExpense(
  input: CreateExpenseInput,
  recordedBy: string,
  recordedByName?: string
): Promise<Expense> {
  const title = input.title?.trim();
  if (!title) throw new BadRequestError('title is required');
  if (!input.category?.trim()) throw new BadRequestError('category is required');
  if (typeof input.amount !== 'number' || input.amount <= 0) {
    throw new BadRequestError('amount must be a positive number');
  }
  if (!input.expenseDate?.trim()) throw new BadRequestError('expenseDate is required');

  const threshold = input.approvalThreshold ?? DEFAULT_APPROVAL_THRESHOLD;
  const needsApproval = input.amount >= threshold;

  const data: NewExpense = {
    id: generateId(),
    category: input.category.trim(),
    title,
    description: input.description ?? null,
    amount: input.amount,
    vendor: input.vendor ?? null,
    expenseDate: input.expenseDate.trim(),
    status: needsApproval ? 'pending' : 'approved',
    requiresApproval: needsApproval ? 1 : 0,
    recordedBy,
    recordedByName: recordedByName ?? null,
    decidedBy: needsApproval ? null : recordedBy,
    decidedAt: needsApproval ? null : new Date(),
    decisionReason: needsApproval ? null : 'Auto-approved (below threshold)',
    term: input.term ?? null,
    session: input.session ?? null,
  };

  return repo.createExpense(data);
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput
): Promise<Expense | undefined> {
  const existing = await repo.findExpenseById(id);
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status !== 'pending') {
    throw new ConflictError(`Cannot edit an expense that is already ${existing.status}`);
  }

  const patch: Partial<NewExpense> = {};
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number' || input.amount <= 0) {
      throw new BadRequestError('amount must be a positive number');
    }
    patch.amount = input.amount;
  }
  if (input.vendor !== undefined) patch.vendor = input.vendor;
  if (input.expenseDate !== undefined) patch.expenseDate = input.expenseDate.trim();
  if (input.term !== undefined) patch.term = input.term;
  if (input.session !== undefined) patch.session = input.session;

  return repo.updateExpense(id, patch);
}

export async function approveExpense(
  id: string,
  decidedBy: string,
  reason?: string
): Promise<Expense | undefined> {
  const existing = await repo.findExpenseById(id);
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status !== 'pending') {
    throw new BadRequestError('Only pending expenses can be approved');
  }

  return repo.updateExpense(id, {
    status: 'approved',
    decidedBy,
    decidedAt: new Date(),
    decisionReason: reason?.trim() || null,
  });
}

export async function rejectExpense(
  id: string,
  decidedBy: string,
  reason: string
): Promise<Expense | undefined> {
  const existing = await repo.findExpenseById(id);
  if (!existing) throw new NotFoundError('Expense not found');
  if (existing.status !== 'pending') {
    throw new BadRequestError('Only pending expenses can be rejected');
  }
  if (!reason?.trim()) {
    throw new BadRequestError('A decision reason is required when rejecting an expense');
  }

  return repo.updateExpense(id, {
    status: 'rejected',
    decidedBy,
    decidedAt: new Date(),
    decisionReason: reason.trim(),
  });
}

export async function deleteExpense(id: string): Promise<boolean> {
  await repo.deleteExpense(id);
  return true;
}

// Aggregated totals for the principal financial read-layer.
export async function summarizeExpenses(filters?: ExpenseFilters): Promise<{
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  pendingCount: number;
  byCategory: Record<string, number>;
}> {
  const rows = await repo.findAllExpenses({ ...filters, limit: 10000, offset: 0 });

  let totalApproved = 0;
  let totalPending = 0;
  let totalRejected = 0;
  let pendingCount = 0;
  const byCategory: Record<string, number> = {};

  for (const row of rows) {
    if (row.status === 'approved') {
      totalApproved += row.amount;
      byCategory[row.category] = (byCategory[row.category] || 0) + row.amount;
    } else if (row.status === 'pending') {
      totalPending += row.amount;
      pendingCount += 1;
    } else if (row.status === 'rejected') {
      totalRejected += row.amount;
    }
  }

  return { totalApproved, totalPending, totalRejected, pendingCount, byCategory };
}
