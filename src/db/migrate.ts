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

const MIGRATION_V2 = `
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('liquidity', 'investment', 'liability')),
  currency TEXT NOT NULL DEFAULT 'EUR',
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE instruments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  isin TEXT UNIQUE,
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('etf', 'stock', 'fund', 'bond', 'other')),
  price_symbol TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  instrument_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('buy', 'sell', 'income')),
  date TEXT NOT NULL,
  quantity REAL,
  unit_price_cents INTEGER,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);
CREATE INDEX idx_transactions_instrument ON transactions(instrument_id);

CREATE TABLE prices (
  instrument_id TEXT NOT NULL,
  date TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'yahoo')),
  PRIMARY KEY (instrument_id, date),
  FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE TABLE balances (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  note TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE UNIQUE INDEX idx_balances_account_date ON balances(account_id, date);
`;

/** Elenco ordinato delle migrazioni. Una migrazione rilasciata non si modifica: se ne aggiunge un'altra. */
export const MIGRATIONS: Migration[] = [
  { version: 1, sql: MIGRATION_V1 },
  { version: 2, sql: MIGRATION_V2 },
];

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
