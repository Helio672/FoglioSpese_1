import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = { version: number; sql: string };

const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  occurred_at TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_occurred_at ON expenses(occurred_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_subcategory ON expenses(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
`;

/** Elenco ordinato delle migrazioni. Una migrazione rilasciata non si modifica: se ne aggiunge un'altra. */
export const MIGRATIONS: Migration[] = [{ version: 1, sql: MIGRATION_V1 }];

async function readUserVersion(sqlite: SQLiteDatabase): Promise<number> {
  const row = await sqlite.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function migrate(
  sqlite: SQLiteDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<void> {
  // Per connessione e inefficace dentro una transazione: va impostato prima.
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');

  const currentVersion = await readUserVersion(sqlite);
  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await sqlite.withTransactionAsync(async () => {
      await sqlite.execAsync(migration.sql);
      await sqlite.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}
