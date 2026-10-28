import { useCallback, useEffect, useState } from 'react';

import { getExpense, listExpenses, sumExpenses } from '@/src/data/expenseRepository';
import { subscribeDb } from '@/src/db/events';
import type { ExpenseFilter, ExpenseListItem } from '@/src/domain/types';
import { useAppDb } from '@/src/hooks/useAppDb';

export function useSpese(filter: ExpenseFilter) {
  const db = useAppDb();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [list, total] = await Promise.all([listExpenses(db, filter), sumExpenses(db, filter)]);
      setItems(list);
      setTotalCents(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le spese.');
    } finally {
      setLoading(false);
    }
  }, [db, filter]);

  useEffect(() => {
    setLoading(true);
    void reload();
    return subscribeDb(() => {
      void reload();
    });
  }, [reload]);

  return { items, totalCents, loading, error, ricarica: reload };
}

export function useSpesa(id: string | undefined) {
  const db = useAppDb();
  const [item, setItem] = useState<ExpenseListItem | null>(null);
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
      setItem(await getExpense(db, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare la spesa.');
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
