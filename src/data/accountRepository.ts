import { and, asc, eq, isNull } from 'drizzle-orm';

import { notifyDbChanged } from '@/src/db/events';
import { accounts } from '@/src/db/schema';
import type { AppDatabase } from '@/src/db/types';
import type { Account, AccountKind } from '@/src/domain/types';

const NAME_REQUIRED = 'Il nome del conto è obbligatorio.';

function newId(): string {
  return `acc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listAccounts(
  db: AppDatabase,
  options: { includeArchived?: boolean } = {},
): Promise<Account[]> {
  const query = db.select().from(accounts);
  const filtered = options.includeArchived ? query : query.where(isNull(accounts.archivedAt));
  return filtered.orderBy(asc(accounts.sortOrder), asc(accounts.name));
}

export async function getAccount(db: AppDatabase, id: string): Promise<Account | null> {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return row ?? null;
}

export async function createAccount(
  db: AppDatabase,
  input: { name: string; kind: AccountKind },
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new Error(NAME_REQUIRED);
  }
  const id = newId();
  const now = new Date().toISOString();
  const existing = await listAccounts(db, { includeArchived: true });
  await db.insert(accounts).values({
    id,
    name,
    kind: input.kind,
    sortOrder: existing.length,
    createdAt: now,
    updatedAt: now,
  });
  notifyDbChanged();
  return id;
}

export async function renameAccount(db: AppDatabase, id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(NAME_REQUIRED);
  }
  await db
    .update(accounts)
    .set({ name: trimmed, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id));
  notifyDbChanged();
}

export async function archiveAccount(db: AppDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(accounts)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(accounts.id, id), isNull(accounts.archivedAt)));
  notifyDbChanged();
}
