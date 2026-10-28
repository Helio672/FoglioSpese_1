import type { drizzle } from 'drizzle-orm/expo-sqlite';

import type * as schema from '@/src/db/schema';

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;
