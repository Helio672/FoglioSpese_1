import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrate } from '@/src/db/migrate';
import * as schema from '@/src/db/schema';
import { seedIfEmpty } from '@/src/db/seed';
import type { AppDatabase } from '@/src/db/types';

export const DATABASE_NAME = 'fogliospese.db';
export type { AppDatabase };

export function createDb(sqlite: SQLiteDatabase): AppDatabase {
  return drizzle(sqlite, { schema });
}

export async function initializeDatabase(sqlite: SQLiteDatabase): Promise<void> {
  await migrate(sqlite);
  const db = createDb(sqlite);
  await seedIfEmpty(db);
}
