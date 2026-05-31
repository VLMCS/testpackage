export type AccountId = 'jan' | 'aki';

export type Account = {
  id: AccountId;
  name: string;
  color: string;
  avatar?: string | null; // data URL for a custom profile picture (compressed)
  startingBalanceCents: number | null;
  pinHash: string | null;
  pinSalt: string | null;
  createdAt: number;
};

// Stored at /workspaces/{workspaceId}. The doc ID is derived from the shared
// passphrase via PBKDF2, so knowing the ID is itself proof of the passphrase —
// that's what gates access (see src/lib/crypto.ts). No passphrase hash is stored.
export type Workspace = {
  baseCurrency: string;
  allowedUids: string[];
  createdAt: number;
  schemaVersion: number;
};

export type CategoryType = 'income' | 'expense' | 'recurring';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string; // lucide-react icon name (used when imageUrl is absent)
  imageUrl?: string | null; // custom uploaded icon (compressed data URL), overrides `icon`
  color: string;
  isDefault: boolean;
  sortOrder: number;
  // When true, this category is omitted from the "Top Category" / "where you spend
  // most" ranking (it still counts toward total spending). Default false.
  excludeFromTop?: boolean;
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
  // Set when this expense was materialized by ticking a recurring bill. Lets the
  // Recurring tab know which template/month a transaction belongs to (and undo it).
  recurringTemplateId?: string | null;
  recurringMonth?: string | null; // 'yyyy-MM'
};

// A recurring bill definition (rent, Netflix, …) owned by one account. Each month
// it appears in the Recurring checklist unchecked; ticking it creates an expense
// transaction for that month (categorized under the special Recurring category).
export type RecurringTemplate = {
  id: string;
  accountId: AccountId;
  name: string;
  amountCents: number;
  note: string;
  active: boolean;
  createdAt: number;
};
