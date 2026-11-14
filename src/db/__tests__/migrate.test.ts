import { MIGRATIONS, migrate } from '@/src/db/migrate';
import { createTestDatabase } from '@/src/db/testing/testDatabase';

describe('migrate', () => {
  it('su un database vuoto crea lo schema e porta user_version a 1', async () => {
    const db = createTestDatabase();

    await migrate(db.sqlite);

    expect(db.tables()).toEqual(
      expect.arrayContaining(['categories', 'subcategories', 'expenses']),
    );
    expect(db.userVersion()).toBe(2);
  });

  it('su un database vuoto crea le tabelle del Patrimonio (v2)', async () => {
    const db = createTestDatabase();

    await migrate(db.sqlite);

    expect(db.tables()).toEqual(
      expect.arrayContaining(['accounts', 'instruments', 'transactions', 'prices', 'balances']),
    );
  });

  it('su un database esistente con user_version 0 conserva le spese e porta a 2', async () => {
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
    expect(db.userVersion()).toBe(2);
  });

  it('un database v1 con spese migra a v2 senza perdere le spese', async () => {
    const db = createTestDatabase();
    await migrate(db.sqlite, MIGRATIONS.filter((migration) => migration.version === 1));
    expect(db.userVersion()).toBe(1);
    db.exec(`
      INSERT INTO categories VALUES ('c1', 'Casa', 0, '2026-01-01');
      INSERT INTO subcategories VALUES ('s1', 'c1', 'Affitto', 0);
      INSERT INTO expenses VALUES ('e1', 85000, 'EUR', '2026-01-02', 'c1', 's1', 'gennaio', '2026-01-02', '2026-01-02');
    `);

    await migrate(db.sqlite);

    expect(db.userVersion()).toBe(2);
    expect(db.tables()).toEqual(expect.arrayContaining(['accounts', 'balances']));
    expect(
      db.all<{ id: string; amount_cents: number; note: string }>(
        'SELECT id, amount_cents, note FROM expenses',
      ),
    ).toEqual([{ id: 'e1', amount_cents: 85000, note: 'gennaio' }]);
  });

  it('eseguita di nuovo non fa nulla', async () => {
    const db = createTestDatabase();
    await migrate(db.sqlite);
    db.exec(
      "INSERT INTO categories VALUES ('c1', 'Casa', 0, '2026-01-01')",
    );

    await migrate(db.sqlite);

    expect(db.all('SELECT id FROM categories')).toHaveLength(1);
    expect(db.userVersion()).toBe(2);
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

  describe('schema v2 del Patrimonio', () => {
    async function migratedDb() {
      const db = createTestDatabase();
      await migrate(db.sqlite);
      return db;
    }
    const account = (id: string, kind: string) =>
      `INSERT INTO accounts (id, name, kind, created_at, updated_at) VALUES ('${id}', 'Conto', '${kind}', '2026-01-01', '2026-01-01')`;

    it('un Conto può essere di liquidità, investimento o passività e nient\'altro', async () => {
      const db = await migratedDb();

      db.exec(account('a1', 'liquidity'));
      db.exec(account('a2', 'investment'));
      db.exec(account('a3', 'liability'));

      expect(() => db.exec(account('a4', 'crypto'))).toThrow();
      expect(db.all('SELECT id FROM accounts')).toHaveLength(3);
    });

    it('l\'ISIN di uno Strumento è univoco, ma più Strumenti possono non averlo', async () => {
      const db = await migratedDb();
      const instrument = (id: string, isin: string | null) =>
        `INSERT INTO instruments (id, name, isin, instrument_type, created_at) VALUES ('${id}', 'X', ${isin ? `'${isin}'` : 'NULL'}, 'etf', '2026-01-01')`;

      db.exec(instrument('i1', 'IE00B4L5Y983'));
      db.exec(instrument('i2', null));
      db.exec(instrument('i3', null));

      expect(() => db.exec(instrument('i4', 'IE00B4L5Y983'))).toThrow();
    });

    it('un Conto ha al più un Saldo per data e il Saldo non è negativo', async () => {
      const db = await migratedDb();
      db.exec(account('a1', 'liquidity'));
      const balance = (id: string, date: string, cents: number) =>
        `INSERT INTO balances (id, account_id, date, amount_cents) VALUES ('${id}', 'a1', '${date}', ${cents})`;

      db.exec(balance('b1', '2026-01-31', 100000));

      expect(() => db.exec(balance('b2', '2026-01-31', 120000))).toThrow();
      expect(() => db.exec(balance('b3', '2026-02-28', -1))).toThrow();
      db.exec(balance('b4', '2026-02-28', 0));
      expect(db.all('SELECT id FROM balances')).toHaveLength(2);
    });

    it('Strumenti, Movimenti e Quotazioni accettano solo i valori della spec', async () => {
      const db = await migratedDb();
      db.exec(account('a1', 'investment'));
      db.exec(
        "INSERT INTO instruments (id, name, instrument_type, created_at) VALUES ('i1', 'X', 'etf', '2026-01-01')",
      );
      const instrumentOfType = (type: string) =>
        `INSERT INTO instruments (id, name, instrument_type, created_at) VALUES ('t-${type}', 'X', '${type}', '2026-01-01')`;
      const transaction = (id: string, kind: string) =>
        `INSERT INTO transactions (id, account_id, instrument_id, kind, date, created_at, updated_at) VALUES ('${id}', 'a1', 'i1', '${kind}', '2026-01-02', '2026-01-02', '2026-01-02')`;
      const price = (date: string, source: string) =>
        `INSERT INTO prices (instrument_id, date, price_cents, source) VALUES ('i1', '${date}', 5000, '${source}')`;

      for (const type of ['etf', 'stock', 'fund', 'bond', 'other']) db.exec(instrumentOfType(type));
      for (const kind of ['buy', 'sell', 'income']) db.exec(transaction(`m-${kind}`, kind));
      db.exec(price('2026-01-02', 'manual'));
      db.exec(price('2026-01-03', 'yahoo'));

      expect(() => db.exec(instrumentOfType('crypto'))).toThrow();
      expect(() => db.exec(transaction('m-x', 'dividend'))).toThrow();
      expect(() => db.exec(price('2026-01-04', 'bloomberg'))).toThrow();
      expect(() => db.exec(price('2026-01-02', 'yahoo'))).toThrow();
    });

    it('indicizza Movimenti per (Conto, data) e per Strumento, Saldi per (Conto, data)', async () => {
      const db = await migratedDb();
      const indexedColumns = (table: string) =>
        db
          .all<{ name: string }>(`SELECT name FROM pragma_index_list('${table}')`)
          .map((index) =>
            db
              .all<{ name: string }>(`SELECT name FROM pragma_index_info('${index.name}') ORDER BY seqno`)
              .map((column) => column.name),
          );

      expect(indexedColumns('transactions')).toEqual(
        expect.arrayContaining([['account_id', 'date'], ['instrument_id']]),
      );
      expect(indexedColumns('balances')).toEqual(expect.arrayContaining([['account_id', 'date']]));
    });
  });
});
