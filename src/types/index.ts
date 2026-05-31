export type AccountId = 'jan' | 'aki';

export type Account = {
  id: AccountId;
  name: string;
  color: string;
  startingBalanceCents: number | null;
  pinHash: string | null;
  pinSalt: string | null;
  createdAt: number;
};

export type Workspace = {
  id: string;
  passphraseHash: string;
  passphraseSalt: string;
  baseCurrency: string;
  allowedUids: string[];
  createdAt: number;
};

export type CategoryType = 'income' | 'expense' | 'recurring';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isDefault: boolean;
};

export type Transaction = {
  id: string;
  accountId: AccountId;
  categoryId: string;
  type: 'income' | 'expense';
  amountCents: number;
  date: string;
  note: string;
  createdAt: number;
  createdBy: AccountId;
};

export type RecurringTemplate = {
  id: string;
  accountId: AccountId;
  categoryId: string;
  name: string;
  amountCents: number;
  note: string;
  active: boolean;
  createdAt: number;
};

export type RecurringInstance = {
  templateId: string;
  yearMonth: string;
  checked: boolean;
  checkedAt: number | null;
};
