import { useCallback, useEffect, useState } from 'react';

import {
  getCategory,
  listAllSubcategories,
  listCategories,
  listSubcategories,
} from '@/src/data/categoryRepository';
import { subscribeDb } from '@/src/db/events';
import type { Category, Subcategory } from '@/src/domain/types';
import { useAppDb } from '@/src/hooks/useAppDb';

export function useCategorie() {
  const db = useAppDb();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await listCategories(db));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le categorie.');
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

export function useCatalogoCategorie() {
  const db = useAppDb();
  const [items, setItems] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [cats, allSubs] = await Promise.all([listCategories(db), listAllSubcategories(db)]);
      setItems(cats);
      setSubs(allSubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le categorie.');
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

  const subcategoriesByCategory = useCallback(
    (categoryId: string) => subs.filter((sub) => sub.categoryId === categoryId),
    [subs],
  );

  return { items, subs, subcategoriesByCategory, loading, error };
}

export function useCategoria(id: string | undefined) {
  const db = useAppDb();
  const [category, setCategory] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setCategory(null);
      setSubs([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [cat, list] = await Promise.all([getCategory(db, id), listSubcategories(db, id)]);
      setCategory(cat);
      setSubs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare la categoria.');
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

  return { category, subs, loading, error, ricarica: reload };
}
