import { migrate } from '@/src/db/migrate';
import { createTestDatabase } from '@/src/db/testing/testDatabase';

describe('migrate', () => {
  it('su un database vuoto crea lo schema e porta user_version a 1', async () => {
    const db = createTestDatabase();

    await migrate(db.sqlite);

    expect(db.tables()).toEqual(
      expect.arrayContaining(['categories', 'subcategories', 'expenses']),
    );
    expect(db.userVersion()).toBe(1);
  });

  it('su un database esistente con user_version 0 conserva le spese e porta a 1', async () => {
    const db = createTestDatabase();
    db.exec(`
      CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE TABLE subcategories (id TEXT PRIMARY KEY NOT NULL, category_id TEXT NOT NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (category_id) REFERENCES categories(id));
      CREATE TABLE expenses (id TEXT PRIMARY KEY NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR', occurred_at TEXT NOT NULL, category_id TEXT NOT NULL, subcategory_id TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id), FOREIGN KEY (subcategory_id) REFERENCES subcategories(id));
      INSERT INTO categories VALUES ('c1', 'Casa', 0, '2026-01-01');
      INSERT INTO subcategories VALUES ('s1', 'c1', 'Affitto', 0);
      INSERT INTO expenses VALUES ('e1', 85000, 'EUR', '2026-01-02', 'c1', 's1', NULL, '2026-01-02', '2026-01-02');
    `);
    expect(db.userVersion()).toBe(0);

    await migrate(db.sqlite);

    expect(db.all<{ id: string; amount_cents: number }>('SELECT id, amount_cents FROM expenses')).toEqual([
      { id: 'e1', amount_cents: 85000 },
    ]);
    expect(db.userVersion()).toBe(1);
  });

  it('eseguita di nuovo non fa nulla', async () => {
    const db = createTestDatabase();
    await migrate(db.sqlite);
    db.exec(
      "INSERT INTO categories VALUES ('c1', 'Casa', 0, '2026-01-01')",
    );

    await migrate(db.sqlite);

    expect(db.all('SELECT id FROM categories')).toHaveLength(1);
    expect(db.userVersion()).toBe(1);
  });

  it('applica solo le migrazioni successive alla versione corrente, in ordine', async () => {
    const db = createTestDatabase();
    const migrations = [
      { version: 1, sql: 'CREATE TABLE a (id INTEGER);' },
      { version: 2, sql: 'CREATE TABLE b (id INTEGER);' },
      { version: 3, sql: 'CREATE TABLE c (id INTEGER);' },
    ];
    await migrate(db.sqlite, migrations.slice(0, 1));
    expect(db.userVersion()).toBe(1);

    await migrate(db.sqlite, migrations);

    expect(db.tables()).toEqual(['a', 'b', 'c']);
    expect(db.userVersion()).toBe(3);
  });

  it('se una migrazione fallisce la annulla e lascia la versione precedente', async () => {
    const db = createTestDatabase();
    const migrations = [
      { version: 1, sql: 'CREATE TABLE a (id INTEGER);' },
      { version: 2, sql: 'CREATE TABLE b (id INTEGER); INSERT INTO inesistente VALUES (1);' },
    ];

    await expect(migrate(db.sqlite, migrations)).rejects.toThrow();

    expect(db.userVersion()).toBe(1);
    expect(db.tables()).toEqual(['a']);
  });
});
