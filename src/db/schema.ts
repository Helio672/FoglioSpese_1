import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
