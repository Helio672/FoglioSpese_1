import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';

import type { AppDatabase } from '@/src/db/types';
import { notifyDbChanged } from '@/src/db/events';
import { categories, expenses, subcategories } from '@/src/db/schema';
import { currentMonthPrefix, startOfNextMonthPrefix } from '@/src/domain/datetime';
import type { ExpenseFilter, ExpenseInput, ExpenseListItem } from '@/src/domain/types';

function newId(): string {
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function applyFilter(filter: ExpenseFilter): SQL | undefined {
  const parts: SQL[] = [];
  if (filter.month === 'current') {
    parts.push(gte(expenses.occurredAt, `${currentMonthPrefix()}-01`));
    parts.push(lt(expenses.occurredAt, `${startOfNextMonthPrefix()}-01`));
  }
  if (filter.categoryId) {
    parts.push(eq(expenses.categoryId, filter.categoryId));
  }
  if (filter.subcategoryId) {
    parts.push(eq(expenses.subcategoryId, filter.subcategoryId));
  }
  if (parts.length === 0) {
    return undefined;
  }
  return and(...parts);
}

const listSelect = {
  id: expenses.id,
  amountCents: expenses.amountCents,
  currency: expenses.currency,
  occurredAt: expenses.occurredAt,
  note: expenses.note,
  categoryId: expenses.categoryId,
  subcategoryId: expenses.subcategoryId,
  categoryName: categories.name,
  subcategoryName: subcategories.name,
};

export async function listExpenses(db: AppDatabase, filter: ExpenseFilter): Promise<ExpenseListItem[]> {
  const where = applyFilter(filter);
  const query = db
    .select(listSelect)
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .orderBy(desc(expenses.occurredAt));
  return where ? query.where(where) : query;
}

export async function sumExpenses(db: AppDatabase, filter: ExpenseFilter): Promise<number> {
  const where = applyFilter(filter);
  const query = db.select({ total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)` }).from(expenses);
  const [row] = where ? await query.where(where) : await query;
  return Number(row?.total ?? 0);
}

export async function getExpense(db: AppDatabase, id: string): Promise<ExpenseListItem | null> {
  const [row] = await db
    .select(listSelect)
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .where(eq(expenses.id, id))
    .limit(1);
  return row ?? null;
}

export async function createExpense(db: AppDatabase, input: ExpenseInput): Promise<string> {
  const id = newId();
  const stamp = nowIso();
  await db.insert(expenses).values({
    id,
    amountCents: input.amountCents,
    currency: 'EUR',
    occurredAt: input.occurredAt,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    note: input.note?.trim() ? input.note.trim() : null,
    createdAt: stamp,
    updatedAt: stamp,
  });
  notifyDbChanged();
  return id;
}

export async function updateExpense(db: AppDatabase, id: string, input: ExpenseInput): Promise<void> {
  await db
    .update(expenses)
    .set({
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      note: input.note?.trim() ? input.note.trim() : null,
      updatedAt: nowIso(),
    })
    .where(eq(expenses.id, id));
  notifyDbChanged();
}

export async function deleteExpense(db: AppDatabase, id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
  notifyDbChanged();
}

export async function countExpensesForCategory(db: AppDatabase, categoryId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(expenses)
    .where(eq(expenses.categoryId, categoryId));
  return Number(row?.value ?? 0);
}

export async function countExpensesForSubcategory(db: AppDatabase, subcategoryId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(expenses)
    .where(eq(expenses.subcategoryId, subcategoryId));
  return Number(row?.value ?? 0);
}
