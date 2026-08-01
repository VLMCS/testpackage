import type { AccountId, CategoryType } from '@/types';

export const STORAGE_KEYS = {
  workspaceId: 'budget.workspaceId',
  lastAccount: 'budget.lastAccount',
  theme: 'budget.theme',
  // Remembers the wallet used on the last transaction so the Add dialog can
  // pre-select it next time (keyed per account below).
  lastWallet: 'budget.lastWallet',
  // sessionStorage (NOT localStorage): keeps the unlocked profile across a
  // refresh, but clears on full app/tab close so a cold launch re-asks the PIN.
  activeSession: 'budget.activeSession',
} as const;

export const DEFAULT_CURRENCY = 'USD';

// Fixed account identities. Display names are editable in Settings, but these IDs
// are stable so transactions/templates keep referencing the right owner.
export const ACCOUNT_DEFS: { id: AccountId; name: string; color: string }[] = [
  { id: 'jan', name: 'Jan', color: '#2563eb' }, // blue
  { id: 'aki', name: 'Aki', color: '#db2777' }, // rose
];

export type CurrencyOption = { code: string; label: string };

// Curated ISO 4217 codes (so Intl currency formatting works). Add more anytime.
export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'PHP', label: 'Philippine Peso (₱)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'CNY', label: 'Chinese Yuan (¥)' },
  { code: 'KRW', label: 'South Korean Won (₩)' },
  { code: 'HKD', label: 'Hong Kong Dollar (HK$)' },
  { code: 'MYR', label: 'Malaysian Ringgit (RM)' },
  { code: 'THB', label: 'Thai Baht (฿)' },
  { code: 'IDR', label: 'Indonesian Rupiah (Rp)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
];

export type CategorySeed = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  sortOrder: number;
};

// Seeded into /workspaces/{id}/categories when a workspace is first created.
// `icon` is a lucide-react component name, resolved at render time (Phase 3).
export const DEFAULT_CATEGORIES: CategorySeed[] = [
  // Income
  { name: 'Income', type: 'income', icon: 'Banknote', color: '#16a34a', sortOrder: 0 },
  { name: 'Commission', type: 'income', icon: 'Percent', color: '#059669', sortOrder: 1 },
  { name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#0d9488', sortOrder: 2 },
  { name: 'Misc', type: 'income', icon: 'Sparkles', color: '#65a30d', sortOrder: 3 },
  // Expense
  { name: 'Food / Drinks', type: 'expense', icon: 'UtensilsCrossed', color: '#ea580c', sortOrder: 0 },
  { name: 'Transport', type: 'expense', icon: 'Car', color: '#0284c7', sortOrder: 1 },
  { name: 'Home Bills', type: 'expense', icon: 'Home', color: '#7c3aed', sortOrder: 2 },
  { name: 'Self-care', type: 'expense', icon: 'Smile', color: '#e11d48', sortOrder: 3 },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#d97706', sortOrder: 4 },
  { name: 'Health', type: 'expense', icon: 'HeartPulse', color: '#dc2626', sortOrder: 5 },
];
// Note: recurring is a behavior (a repeating bill filed under a real expense
// category), NOT its own category — so nothing of type 'recurring' is seeded.

export type WalletSeed = {
  name: string;
  icon: string; // lucide-react component name
  color: string;
  sortOrder: number;
};

// Seeded per account so the wallet picker is usable immediately. Users can
// rename, recolor, add, or delete these freely. Opening balances start at 0 —
// the user sets them in the Wallets screen.
export const DEFAULT_WALLETS: WalletSeed[] = [
  { name: 'Cash', icon: 'Wallet', color: '#16a34a', sortOrder: 0 },
  { name: 'Bank', icon: 'Landmark', color: '#2563eb', sortOrder: 1 },
];
