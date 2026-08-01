// Account identifier. The original two accounts use the literal ids 'jan'/'aki';
// accounts added later get Firestore auto-ids. So this is just a string.
export type AccountId = string;

export type Account = {
  id: AccountId;
  name: string;
  color: string;
  avatar?: string | null; // data URL for a custom profile picture (compressed)
  baseCurrency?: string; // per-account currency; falls back to the workspace currency
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
  // Admin mode gate. PBKDF2-hashed (see src/lib/crypto.ts) password that protects
  // destructive actions like deleting a profile. Absent until the first user sets
  // it up. Shared across paired devices, matching the household trust model.
  adminHash?: string | null;
  adminSalt?: string | null;
};

export type CategoryType = 'income' | 'expense' | 'recurring';

export type Category = {
  id: string;
  accountId: AccountId; // owner — categories are per-account
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

// A money source that lives inside a person-Account (Cash, Bank, Credit Card,
// GCash, …). It answers "where did this money actually come from / go to". A
// wallet's balance is derived: startingBalanceCents + the transactions assigned
// to it (see walletBalanceCents in src/lib/selectors.ts). Wallets are additive —
// older transactions have no walletId and are treated as "unassigned".
export type Wallet = {
  id: string;
  accountId: AccountId; // owner — wallets are per-account, like categories
  name: string;
  color: string;
  icon: string; // lucide-react icon name
  startingBalanceCents: number; // opening balance for this wallet (may be 0)
  sortOrder: number;
  active: boolean;
  createdAt: number;
};

// Moves money between two of an account's wallets without being spending or
// income. A null endpoint means the "Unassigned" bucket — the account's money
// that isn't in a named wallet yet (opening balance + transactions with no
// walletId). Transfers live in their own subcollection so they never count as
// transactions, never touch the account's total balance, and only shift where
// money sits between wallets (see selectors.ts).
export type Transfer = {
  id: string;
  accountId: AccountId;
  fromWalletId: string | null; // null = Unassigned bucket
  toWalletId: string | null; // null = Unassigned bucket
  amountCents: number;
  date: string; // 'yyyy-MM-dd'
  note: string;
  createdAt: number;
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
  // The wallet this transaction draws from (expense) or lands in (income).
  // Optional/absent on transactions created before Wallets existed — such
  // transactions are "unassigned" and simply don't count toward any wallet
  // balance. The account-level balance is unaffected either way.
  walletId?: string | null;
  // Set when this expense was materialized by ticking a recurring bill. Lets the
  // Recurring tab know which template/month a transaction belongs to (and undo it).
  recurringTemplateId?: string | null;
  recurringMonth?: string | null; // 'yyyy-MM'
  // When true, this transaction is excluded from Spending/Saved totals and category
  // insights, but STILL moves the account balance (the money really left/arrived).
  // Use for transfers that aren't real spending — e.g. moving funds to a savings
  // account. It keeps its normal category. Absent/false on older transactions.
  notTracked?: boolean;
};

// A savings goal ("Finance Plan") — Emergency Fund, House, Vacation, … owned by
// one account. Progress can either mirror a linked wallet's balance (walletId
// set) or be tracked manually (savedCents). Fully additive: its own subcollection.
export type FinancePlan = {
  id: string;
  accountId: AccountId;
  name: string;
  icon: string; // lucide-react icon name
  color: string;
  targetCents: number; // the goal amount
  // When set, the plan's saved amount is that wallet's live balance. When unset,
  // savedCents below is used (a manually maintained figure).
  walletId?: string | null;
  savedCents?: number; // manual progress; ignored when walletId is set
  deadline?: string | null; // optional target date 'yyyy-MM-dd'
  active: boolean;
  createdAt: number;
};

// A recurring bill definition (rent, Netflix, …) owned by one account. Each month
// it appears in the Recurring checklist unchecked; ticking it creates an expense
// transaction for that month (categorized under the special Recurring category).
export type RecurringTemplate = {
  id: string;
  accountId: AccountId;
  // The category a ticked bill is recorded under (e.g. Electricity → Home Bills).
  // Falls back to the special Recurring category when unset (older templates).
  categoryId?: string;
  name: string;
  // The default amount used for any month that doesn't have an override below.
  amountCents: number;
  // Per-month amount overrides keyed by month (yyyy-MM). When a key is present,
  // it replaces amountCents for that month only (e.g. electricity spikes in June).
  monthlyAmounts?: Record<string, number>;
  note: string;
  active: boolean;
  createdAt: number;
};
