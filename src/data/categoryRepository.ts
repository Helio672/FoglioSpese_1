import { asc, eq } from 'drizzle-orm';

import { countExpensesForCategory, countExpensesForSubcategory } from '@/src/data/expenseRepository';
import type { AppDatabase } from '@/src/db/types';
import { notifyDbChanged } from '@/src/db/events';
import { categories, subcategories } from '@/src/db/schema';
import type { Category, Subcategory } from '@/src/domain/types';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listCategories(db: AppDatabase): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategory(db: AppDatabase, id: string): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

export async function listSubcategories(db: AppDatabase, categoryId: string): Promise<Subcategory[]> {
  return db
    .select()
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId))
    .orderBy(asc(subcategories.sortOrder), asc(subcategories.name));
}

export async function listAllSubcategories(db: AppDatabase): Promise<Subcategory[]> {
  return db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.name));
}

export async function createCategory(db: AppDatabase, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Il nome della categoria è obbligatorio.');
  }
  const id = newId('cat');
  const existing = await listCategories(db);
  await db.insert(categories).values({
    id,
    name: trimmed,
    sortOrder: existing.length,
    createdAt: new Date().toISOString(),
  });
  notifyDbChanged();
  return id;
}

export async function updateCategory(db: AppDatabase, id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Il nome della categoria è obbligatorio.');
  }
  await db.update(categories).set({ name: trimmed }).where(eq(categories.id, id));
  notifyDbChanged();
}

export async function deleteCategory(db: AppDatabase, id: string): Promise<void> {
  const used = await countExpensesForCategory(db, id);
  if (used > 0) {
    throw new Error('Non puoi eliminare una categoria che ha delle spese.');
  }
  await db.delete(subcategories).where(eq(subcategories.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
  notifyDbChanged();
}

export async function createSubcategory(db: AppDatabase, categoryId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Il nome della sottocategoria è obbligatorio.');
  }
  const id = newId('sub');
  const existing = await listSubcategories(db, categoryId);
  await db.insert(subcategories).values({
    id,
    categoryId,
    name: trimmed,
    sortOrder: existing.length,
  });
  notifyDbChanged();
  return id;
}

export async function updateSubcategory(db: AppDatabase, id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Il nome della sottocategoria è obbligatorio.');
  }
  await db.update(subcategories).set({ name: trimmed }).where(eq(subcategories.id, id));
  notifyDbChanged();
}

export async function deleteSubcategory(db: AppDatabase, id: string): Promise<void> {
  const used = await countExpensesForSubcategory(db, id);
  if (used > 0) {
    throw new Error('Non puoi eliminare una sottocategoria che ha delle spese.');
  }
  await db.delete(subcategories).where(eq(subcategories.id, id));
  notifyDbChanged();
}
