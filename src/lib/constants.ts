import type { AccountId, CategoryType, WalletInterest } from '@/types';

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

export type PlanPreset = { name: string; icon: string; color: string };

// Quick-start presets for common savings goals (see roadmap 03_Finance_Planning).
// Picking one pre-fills the New Plan form; everything stays editable.
export const PLAN_PRESETS: PlanPreset[] = [
  { name: 'Emergency Fund', icon: 'PiggyBank', color: '#16a34a' },
  { name: 'House', icon: 'Home', color: '#7c3aed' },
  { name: 'New Car', icon: 'Car', color: '#0284c7' },
  { name: 'Vacation', icon: 'Plane', color: '#0d9488' },
  { name: 'Wedding', icon: 'Gift', color: '#e11d48' },
  { name: 'Retirement', icon: 'TrendingUp', color: '#d97706' },
  { name: 'Education', icon: 'GraduationCap', color: '#2563eb' },
];

export type WalletPreset = {
  name: string;
  icon: string;
  color: string;
  // Optional starting interest config. These are published base rates captured
  // on the date below — they change often, so they're only a starting point the
  // user confirms/edits. Omitted for accounts without a stable published rate
  // (traditional banks, promo-heavy e-wallets).
  interest?: WalletInterest;
};

// When the preset interest rates below were last checked. Shown in the editor so
// the user knows to verify against their bank.
export const INTEREST_RATES_AS_OF = 'July 2026';

// Quick-add presets for common Philippine banks and e-wallets. Picking one
// pre-fills the New Wallet form (name/color/icon, and interest when known). The
// user can still edit everything before saving. Colors approximate each brand.
export const WALLET_PRESETS: WalletPreset[] = [
  { name: 'Cash', icon: 'Wallet', color: '#16a34a' },
  { name: 'GCash', icon: 'Smartphone', color: '#0a7ff0' },
  { name: 'Maya', icon: 'Smartphone', color: '#16b25a' }, // promo-based rate — set it yourself
  { name: 'BDO', icon: 'Landmark', color: '#1a3f8b' },
  { name: 'BPI', icon: 'Landmark', color: '#b01116' },
  {
    name: 'GoTyme',
    icon: 'Landmark',
    color: '#00b6cf',
    interest: {
      frequency: 'monthly',
      tiers: [{ upToCents: null, ratePercent: 3.0 }],
      withholdingTaxPercent: 20,
    },
  },
  {
    name: 'Maribank',
    icon: 'Landmark',
    color: '#f45c1f',
    interest: {
      frequency: 'daily',
      tiers: [
        { upToCents: 100_000_000, ratePercent: 3.25 }, // up to PHP 1,000,000
        { upToCents: null, ratePercent: 3.75 }, // and above
      ],
      withholdingTaxPercent: 20,
    },
  },
  {
    name: 'Netbank',
    icon: 'Landmark',
    color: '#0f766e',
    interest: {
      frequency: 'monthly',
      tiers: [{ upToCents: null, ratePercent: 3.25 }],
      withholdingTaxPercent: 20,
    },
  },
  {
    name: 'SeaBank',
    icon: 'Landmark',
    color: '#f6511d',
    interest: {
      frequency: 'daily',
      tiers: [
        { upToCents: 100_000_000, ratePercent: 3.25 },
        { upToCents: null, ratePercent: 3.75 },
      ],
      withholdingTaxPercent: 20,
    },
  },
  { name: 'UnionBank', icon: 'Landmark', color: '#f79008' },
  { name: 'Metrobank', icon: 'Landmark', color: '#0a2a66' },
  {
    name: 'CIMB',
    icon: 'Landmark',
    color: '#7a141d',
    interest: {
      frequency: 'monthly',
      tiers: [{ upToCents: null, ratePercent: 2.3 }],
      withholdingTaxPercent: 20,
    },
  },
  { name: 'Credit Card', icon: 'CreditCard', color: '#6d28d9' },
];
