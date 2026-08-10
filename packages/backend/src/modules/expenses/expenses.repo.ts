import { db } from '../../config/db.js';
import { expenses } from '../../db/schema/expenses.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import type { Expense, NewExpense } from '../../db/schema/expenses.js';

export interface ExpenseFilters {
  status?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  term?: string;
  session?: string;
  limit?: number;
  offset?: number;
}

export async function findAllExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const conditions = [];

  if (filters?.status) conditions.push(eq(expenses.status, filters.status as any));
  if (filters?.category) conditions.push(eq(expenses.category, filters.category));
  if (filters?.fromDate) conditions.push(gte(expenses.expenseDate, filters.fromDate));
  if (filters?.toDate) conditions.push(lte(expenses.expenseDate, filters.toDate));
  if (filters?.term) conditions.push(eq(expenses.term, filters.term));
  if (filters?.session) conditions.push(eq(expenses.session, filters.session));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0);
}

export async function findExpenseById(id: string): Promise<Expense | undefined> {
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result[0];
}

export async function createExpense(data: NewExpense): Promise<Expense> {
  const [row] = await db.insert(expenses).values(data).returning();
  return row;
}

export async function updateExpense(
  id: string,
  data: Partial<NewExpense>
): Promise<Expense | undefined> {
  const [row] = await db
    .update(expenses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning();
  return row;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}
