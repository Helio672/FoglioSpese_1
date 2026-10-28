export type ExpenseFilter = {
  month: 'current' | 'all';
  categoryId?: string;
  subcategoryId?: string;
};

export type ExpenseListItem = {
  id: string;
  amountCents: number;
  currency: string;
  occurredAt: string;
  note: string | null;
  categoryId: string;
  subcategoryId: string;
  categoryName: string;
  subcategoryName: string;
};

export type ExpenseInput = {
  amountCents: number;
  occurredAt: string;
  categoryId: string;
  subcategoryId: string;
  note?: string | null;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
};
