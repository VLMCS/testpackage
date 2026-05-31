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
