import { useCallback, useEffect, useState } from 'react';

import { getAccount, listAccounts } from '@/src/data/accountRepository';
import { subscribeDb } from '@/src/db/events';
import type { Account } from '@/src/domain/types';
import { useAppDb } from '@/src/hooks/useAppDb';

export function useConti() {
  const db = useAppDb();
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await listAccounts(db));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i conti.');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void reload();
    return subscribeDb(() => {
      void reload();
    });
  }, [reload]);

  return { items, loading, error, ricarica: reload };
}

export function useConto(id: string | undefined) {
  const db = useAppDb();
  const [item, setItem] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setItem(await getAccount(db, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare il conto.');
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    setLoading(true);
    void reload();
    return subscribeDb(() => {
      void reload();
    });
  }, [reload]);

  return { item, loading, error, ricarica: reload };
}
