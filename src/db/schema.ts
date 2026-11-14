import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order', { mode: 'number' }).notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const subcategories = sqliteTable('subcategories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  name: text('name').notNull(),
  sortOrder: integer('sort_order', { mode: 'number' }).notNull().default(0),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  amountCents: integer('amount_cents', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('EUR'),
  occurredAt: text('occurred_at').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  subcategoryId: text('subcategory_id')
    .notNull()
    .references(() => subcategories.id),
  note: text('note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['liquidity', 'investment', 'liability'] }).notNull(),
  currency: text('currency').notNull().default('EUR'),
  sortOrder: integer('sort_order', { mode: 'number' }).notNull().default(0),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const instruments = sqliteTable('instruments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isin: text('isin').unique(),
  instrumentType: text('instrument_type', {
    enum: ['etf', 'stock', 'fund', 'bond', 'other'],
  }).notNull(),
  priceSymbol: text('price_symbol'),
  currency: text('currency').notNull().default('EUR'),
  createdAt: text('created_at').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    instrumentId: text('instrument_id')
      .notNull()
      .references(() => instruments.id),
    kind: text('kind', { enum: ['buy', 'sell', 'income'] }).notNull(),
    date: text('date').notNull(),
    quantity: real('quantity'),
    unitPriceCents: integer('unit_price_cents', { mode: 'number' }),
    feesCents: integer('fees_cents', { mode: 'number' }).notNull().default(0),
    amountCents: integer('amount_cents', { mode: 'number' }),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_transactions_account_date').on(table.accountId, table.date),
    index('idx_transactions_instrument').on(table.instrumentId),
  ],
);

export const prices = sqliteTable(
  'prices',
  {
    instrumentId: text('instrument_id')
      .notNull()
      .references(() => instruments.id),
    date: text('date').notNull(),
    priceCents: integer('price_cents', { mode: 'number' }).notNull(),
    source: text('source', { enum: ['manual', 'yahoo'] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.instrumentId, table.date] })],
);

export const balances = sqliteTable(
  'balances',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    date: text('date').notNull(),
    amountCents: integer('amount_cents', { mode: 'number' }).notNull(),
    note: text('note'),
  },
  (table) => [uniqueIndex('idx_balances_account_date').on(table.accountId, table.date)],
);
