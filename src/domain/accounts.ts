import type { Account, AccountKind } from '@/src/domain/types';

export const ACCOUNT_KINDS: { kind: AccountKind; title: string; singular: string }[] = [
  { kind: 'liquidity', title: 'Liquidità', singular: 'Liquidità' },
  { kind: 'investment', title: 'Investimenti', singular: 'Investimento' },
  { kind: 'liability', title: 'Passività', singular: 'Passività' },
];

export type AccountGroup = { kind: AccountKind; title: string; accounts: Account[] };

export function groupAccountsByKind(accounts: Account[]): AccountGroup[] {
  return ACCOUNT_KINDS.map(({ kind, title }) => ({
    kind,
    title,
    accounts: accounts.filter((account) => account.kind === kind),
  })).filter((group) => group.accounts.length > 0);
}
