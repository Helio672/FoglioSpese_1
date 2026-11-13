import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Database SQLite reale in memoria (node:sqlite) esposto con la sola parte
 * dell'API di expo-sqlite usata da `migrate`.
 */
export function createTestDatabase() {
  const raw = new DatabaseSync(':memory:');
  const sqlite = {
    execAsync: async (source: string) => {
      raw.exec(source);
    },
    getFirstAsync: async (source: string) => raw.prepare(source).get() ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;

  return {
    sqlite,
    userVersion: () =>
      (raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    tables: () =>
      (
        raw
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
          .all() as { name: string }[]
      ).map((row) => row.name),
    exec: (sql: string) => raw.exec(sql),
    all: <T>(sql: string) => raw.prepare(sql).all() as T[],
  };
}
