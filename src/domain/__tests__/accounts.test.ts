import { groupAccountsByKind } from '@/src/domain/accounts';
import type { Account } from '@/src/domain/types';

const account = (id: string, kind: Account['kind']): Account => ({
  id,
  name: id,
  kind,
  currency: 'EUR',
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('groupAccountsByKind', () => {
  it('raggruppa per Tipo conto nell\'ordine liquidità, investimenti, passività e omette i gruppi vuoti', () => {
    const groups = groupAccountsByKind([
      account('mutuo', 'liability'),
      account('corrente', 'liquidity'),
      account('contanti', 'liquidity'),
    ]);

    expect(groups.map((group) => [group.title, group.accounts.map((a) => a.id)])).toEqual([
      ['Liquidità', ['corrente', 'contanti']],
      ['Passività', ['mutuo']],
    ]);
  });

  it('senza Conti non produce gruppi', () => {
    expect(groupAccountsByKind([])).toEqual([]);
  });
});
