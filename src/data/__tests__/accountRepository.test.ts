import {
  archiveAccount,
  createAccount,
  getAccount,
  listAccounts,
  renameAccount,
} from '@/src/data/accountRepository';
import { migrate } from '@/src/db/migrate';
import { subscribeDb } from '@/src/db/events';
import { createTestDatabase } from '@/src/db/testing/testDatabase';

async function setup() {
  const testDb = createTestDatabase();
  await migrate(testDb.sqlite);
  return testDb.db;
}

describe('accountRepository', () => {
  it('crea un Conto di ciascun Tipo conto e li elenca', async () => {
    const db = await setup();

    await createAccount(db, { name: 'Conto corrente BBVA', kind: 'liquidity' });
    await createAccount(db, { name: 'Conto titoli Fineco', kind: 'investment' });
    await createAccount(db, { name: 'Mutuo casa', kind: 'liability' });

    const accounts = await listAccounts(db);
    expect(accounts.map(({ name, kind, currency, archivedAt }) => ({ name, kind, currency, archivedAt }))).toEqual([
      { name: 'Conto corrente BBVA', kind: 'liquidity', currency: 'EUR', archivedAt: null },
      { name: 'Conto titoli Fineco', kind: 'investment', currency: 'EUR', archivedAt: null },
      { name: 'Mutuo casa', kind: 'liability', currency: 'EUR', archivedAt: null },
    ]);
  });

  it('rifiuta un nome vuoto', async () => {
    const db = await setup();

    await expect(createAccount(db, { name: '   ', kind: 'liquidity' })).rejects.toThrow(
      'Il nome del conto è obbligatorio.',
    );
    expect(await listAccounts(db)).toEqual([]);
  });

  it('rinomina un Conto senza cambiarne il Tipo', async () => {
    const db = await setup();
    const id = await createAccount(db, { name: 'Contanti', kind: 'liquidity' });

    await renameAccount(db, id, '  Portafoglio  ');

    const account = await getAccount(db, id);
    expect(account).toMatchObject({ name: 'Portafoglio', kind: 'liquidity' });
    await expect(renameAccount(db, id, '')).rejects.toThrow('Il nome del conto è obbligatorio.');
  });

  it('archiviare un Conto lo toglie dall\'elenco ma lo conserva', async () => {
    const db = await setup();
    const keep = await createAccount(db, { name: 'Conto A', kind: 'liquidity' });
    const archived = await createAccount(db, { name: 'Conto B', kind: 'liquidity' });

    await archiveAccount(db, archived);

    expect((await listAccounts(db)).map((account) => account.id)).toEqual([keep]);
    expect((await listAccounts(db, { includeArchived: true })).map((account) => account.id)).toEqual([
      keep,
      archived,
    ]);
    expect((await getAccount(db, archived))?.archivedAt).not.toBeNull();
  });

  it('notifica il database quando un Conto cambia', async () => {
    const db = await setup();
    const listener = jest.fn();
    const unsubscribe = subscribeDb(listener);

    const id = await createAccount(db, { name: 'Conto', kind: 'liquidity' });
    await renameAccount(db, id, 'Altro');
    await archiveAccount(db, id);

    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
