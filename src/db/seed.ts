import { count } from 'drizzle-orm';

import type { AppDatabase } from '@/src/db/types';
import { categories, subcategories } from '@/src/db/schema';

const now = '2026-01-01T00:00:00';

const SEED: { id: string; name: string; subs: { id: string; name: string }[] }[] = [
  {
    id: 'cat-casa',
    name: 'Casa',
    subs: [
      { id: 'sub-casa-affitto', name: 'Affitto' },
      { id: 'sub-casa-bollette', name: 'Bollette' },
      { id: 'sub-casa-manutenzione', name: 'Manutenzione' },
      { id: 'sub-casa-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-alimentari',
    name: 'Alimentari',
    subs: [
      { id: 'sub-alim-super', name: 'Supermercato' },
      { id: 'sub-alim-ristorante', name: 'Ristorante' },
      { id: 'sub-alim-bar', name: 'Bar' },
      { id: 'sub-alim-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-trasporti',
    name: 'Trasporti',
    subs: [
      { id: 'sub-tr-carburante', name: 'Carburante' },
      { id: 'sub-tr-mezzi', name: 'Mezzi pubblici' },
      { id: 'sub-tr-auto', name: 'Auto' },
      { id: 'sub-tr-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-salute',
    name: 'Salute',
    subs: [
      { id: 'sub-sal-farmacia', name: 'Farmacia' },
      { id: 'sub-sal-visite', name: 'Visite' },
      { id: 'sub-sal-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-svago',
    name: 'Svago',
    subs: [
      { id: 'sub-sv-uscite', name: 'Uscite' },
      { id: 'sub-sv-hobby', name: 'Hobby' },
      { id: 'sub-sv-viaggi', name: 'Viaggi' },
      { id: 'sub-sv-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-abbigliamento',
    name: 'Abbigliamento',
    subs: [
      { id: 'sub-abb-vestiti', name: 'Vestiti' },
      { id: 'sub-abb-scarpe', name: 'Scarpe' },
      { id: 'sub-abb-altro', name: 'Altro' },
    ],
  },
  {
    id: 'cat-altro',
    name: 'Altro',
    subs: [{ id: 'sub-altro-varie', name: 'Varie' }],
  },
];

export async function seedIfEmpty(db: AppDatabase): Promise<void> {
  const [row] = await db.select({ value: count() }).from(categories);
  if ((row?.value ?? 0) > 0) {
    return;
  }

  await db.insert(categories).values(
    SEED.map((category, index) => ({
      id: category.id,
      name: category.name,
      sortOrder: index,
      createdAt: now,
    })),
  );

  await db.insert(subcategories).values(
    SEED.flatMap((category, categoryIndex) =>
      category.subs.map((sub, subIndex) => ({
        id: sub.id,
        categoryId: category.id,
        name: sub.name,
        sortOrder: categoryIndex * 10 + subIndex,
      })),
    ),
  );
}
