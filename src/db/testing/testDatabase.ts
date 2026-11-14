import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import * as schema from '@/src/db/schema';
import type { AppDatabase } from '@/src/db/types';

/**
 * Database SQLite reale in memoria (node:sqlite) esposto con la sola parte
 * dell'API di expo-sqlite usata da `migrate` e dal driver drizzle (`prepareSync`).
 */
export function createTestDatabase() {
  const raw = new DatabaseSync(':memory:');
  const sqlite = {
    execAsync: async (source: string) => {
      raw.exec(source);
    },
    prepareSync: (source: string) => {
      const statement = raw.prepare(source);
      type Params = Parameters<typeof statement.all>;
      const readsRows = statement.columns().length > 0;
      return {
        executeSync: (params: unknown[] = []) => {
          statement.setReturnArrays(false);
          if (!readsRows) {
            const { changes, lastInsertRowid } = statement.run(...(params as Params));
            return { changes: Number(changes), lastInsertRowId: Number(lastInsertRowid) };
          }
          return {
            getAllSync: () => statement.all(...(params as Params)),
            getFirstSync: () => statement.get(...(params as Params)) ?? null,
          };
        },
        executeForRawResultSync: (params: unknown[] = []) => {
          statement.setReturnArrays(true);
          return { getAllSync: () => statement.all(...(params as Params)) };
        },
      };
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
    db: drizzle(sqlite, { schema }) as AppDatabase,
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
