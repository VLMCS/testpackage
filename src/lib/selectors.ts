import type {
  Account,
  BudgetAllocation,
  Category,
  Transaction,
  Transfer,
  Wallet,
} from '@/types';
import { monthKeyOf } from './date';

export interface MonthTotals {
  incomeCents: number;
  expenseCents: number;
  savedCents: number;
}

export function totalsForMonth(
  txns: Transaction[],
  accountId: string,
  monthKey: string,
): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.accountId !== accountId) continue;
    if (t.notTracked) continue; // transfers excluded from Spending/Saved (still hit balance)
    if (monthKeyOf(t.date) !== monthKey) continue;
    if (t.type === 'income') income += t.amountCents;
    else expense += t.amountCents;
  }
  return { incomeCents: income, expenseCents: expense, savedCents: income - expense };
}

/**
 * All-time running balance: opening balance + incomes − expenses. Note that
 * `notTracked` transfers ARE counted here on purpose — the money really moved in
 * or out of the account, so the balance must reflect it (they're only hidden from
 * the Spending/Saved metrics).
 */
export function currentBalanceCents(account: Account, txns: Transaction[]): number {
  let balance = account.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  return balance;
}

/**
 * Account balance carried into the start of `monthKey` — opening balance plus
 * every transaction dated in an earlier month, before any of this month's
 * activity. This is "what you started the month with". Like currentBalanceCents,
 * it counts notTracked transfers (the money really moved).
 */
export function balanceAtMonthStart(
  account: Account,
  txns: Transaction[],
  monthKey: string,
): number {
  let balance = account.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
    if (monthKeyOf(t.date) >= monthKey) continue; // only strictly-earlier months
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  return balance;
}

/**
 * Account balance at the end of `monthKey` — opening balance plus every
 * transaction dated within the month and earlier. Equals balanceAtMonthStart
 * plus the month's net movement. Counts notTracked transfers, as above.
 */
export function balanceAtMonthEnd(
  account: Account,
  txns: Transaction[],
  monthKey: string,
): number {
  let balance = account.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
    if (monthKeyOf(t.date) > monthKey) continue; // include this month and earlier
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  return balance;
}

/**
 * Maps each of the account's transaction ids to the running account balance
 * immediately after that transaction, walking oldest → newest. Counts notTracked
 * transfers (they move the balance). Because it's keyed by id and derived from
 * the account's full history, callers can show a correct "balance after" figure
 * even when the visible list is filtered by date or category.
 */
export function runningBalancesByTxn(
  account: Account,
  txns: Transaction[],
): Record<string, number> {
  const mine = txns
    .filter((t) => t.accountId === account.id)
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  const out: Record<string, number> = {};
  let balance = account.startingBalanceCents ?? 0;
  for (const t of mine) {
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
    out[t.id] = balance;
  }
  return out;
}

/**
 * Running balance of a single wallet: its opening balance, plus every
 * transaction assigned to it (income adds, expense subtracts), plus the net of
 * transfers into/out of it. `notTracked` transactions still count here — the
 * money really moved in or out of the wallet. Transactions with no walletId are
 * ignored (they live in the Unassigned bucket instead).
 */
export function walletBalanceCents(
  wallet: Wallet,
  txns: Transaction[],
  transfers: Transfer[] = [],
): number {
  let balance = wallet.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.walletId !== wallet.id) continue;
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  for (const tr of transfers) {
    if (tr.toWalletId === wallet.id) balance += tr.amountCents;
    if (tr.fromWalletId === wallet.id) balance -= tr.amountCents;
  }
  return balance;
}

/**
 * The "Unassigned" bucket for one account: money that isn't in a named wallet.
 * It's the account's opening balance, plus every transaction with no walletId,
 * plus the net of transfers whose endpoint is Unassigned (null). This is what a
 * pre-Wallets household starts with, and what wallet-to-wallet transfers draw
 * from until it's been allocated out. Counts notTracked transactions (the money
 * really moved).
 */
export function unassignedBalanceCents(
  account: Account,
  txns: Transaction[],
  transfers: Transfer[] = [],
): number {
  let balance = account.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
    if (t.walletId) continue; // belongs to a named wallet
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  for (const tr of transfers) {
    if (tr.accountId !== account.id) continue;
    if (tr.toWalletId === null) balance += tr.amountCents;
    if (tr.fromWalletId === null) balance -= tr.amountCents;
  }
  return balance;
}

/**
 * Net worth for one account: the Unassigned bucket plus every one of the
 * account's wallets. This is the honest total of all the account's money and
 * matches the "Across all wallets" total on the Wallets screen. Unlike
 * currentBalanceCents, it includes wallet opening balances.
 */
export function netWorthCents(
  account: Account,
  wallets: Wallet[],
  txns: Transaction[],
  transfers: Transfer[] = [],
): number {
  let total = unassignedBalanceCents(account, txns, transfers);
  for (const w of wallets) {
    if (w.accountId !== account.id) continue;
    total += walletBalanceCents(w, txns, transfers);
  }
  return total;
}

export interface BudgetProgress {
  spentCents: number;
  limitCents: number;
  remainingCents: number; // negative when over budget
  /** Spent as a fraction of the limit, capped at 1. */
  ratio: number;
  /** Remaining as a fraction of the limit (0–1) — the "money left" bar width. */
  remainingRatio: number;
  over: boolean; // spent more than the limit
  low: boolean; // not over, but little left (≤20%)
}

/**
 * Progress of a budget framed around what's LEFT (a budget is something to stay
 * under, not a gauge to fill). `remainingRatio` drives a depleting bar; `low`
 * flags when you're running out.
 */
export function budgetProgress(limitCents: number, spentCents: number): BudgetProgress {
  const remainingCents = limitCents - spentCents;
  const ratio = limitCents > 0 ? Math.min(1, spentCents / limitCents) : spentCents > 0 ? 1 : 0;
  const remainingRatio =
    limitCents > 0 ? Math.min(1, Math.max(0, remainingCents / limitCents)) : spentCents > 0 ? 0 : 1;
  const over = spentCents > limitCents;
  return {
    spentCents,
    limitCents,
    remainingCents,
    ratio,
    remainingRatio,
    over,
    low: !over && remainingRatio <= 0.2,
  };
}

/**
 * Colour band for a budget gauge, framed around how much is LEFT:
 *  - 'full'   → nothing spent yet (green)
 *  - 'mid'    → more than half the budget still available (amber)
 *  - 'low'    → half or less remaining, or already over (red)
 */
export function budgetLevel(p: BudgetProgress): 'full' | 'mid' | 'low' {
  if (p.over) return 'low';
  if (p.remainingRatio >= 1) return 'full';
  if (p.remainingRatio > 0.5) return 'mid';
  return 'low';
}

/**
 * Whether a budget's limit applies to a given month. Recurring budgets apply to
 * every month; a one-time budget applies only to its own monthKey.
 */
export function budgetAppliesToMonth(budget: BudgetAllocation, monthKey: string): boolean {
  return budget.recurring ? true : budget.monthKey === monthKey;
}

/**
 * Amount spent against a budget in a given month: the sum of tracked EXPENSES
 * explicitly assigned to it (Transaction.budgetId) and dated in that month.
 * notTracked expenses are excluded, matching other spending metrics.
 */
export function budgetSpentCents(
  txns: Transaction[],
  budgetId: string,
  monthKey: string,
): number {
  let sum = 0;
  for (const t of txns) {
    if (t.budgetId !== budgetId || t.type !== 'expense') continue;
    if (t.notTracked) continue;
    if (monthKeyOf(t.date) !== monthKey) continue;
    sum += t.amountCents;
  }
  return sum;
}

/** Tracked expense total for one account on a single ISO day (yyyy-MM-dd). */
export function spentOnDayCents(
  txns: Transaction[],
  accountId: string,
  dayIso: string,
): number {
  let sum = 0;
  for (const t of txns) {
    if (t.accountId !== accountId || t.type !== 'expense') continue;
    if (t.notTracked) continue; // transfers/savings moves aren't spending
    if (t.date !== dayIso) continue;
    sum += t.amountCents;
  }
  return sum;
}

/** Map of categoryId → expense cents for one account in one month. */
export function spendingByCategory(
  txns: Transaction[],
  accountId: string,
  monthKey: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txns) {
    if (t.accountId !== accountId || t.type !== 'expense') continue;
    if (t.notTracked) continue; // transfers don't count toward category spend / rankings
    if (monthKeyOf(t.date) !== monthKey) continue;
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amountCents;
  }
  return out;
}

export interface CategorySpend {
  category: Category;
  cents: number;
}

/**
 * Expense categories ranked by spend for the month, highest first. Categories
 * flagged `excludeFromTop` are omitted from this ranking (they still count toward
 * total spending elsewhere).
 */
export function topSpendingCategories(
  txns: Transaction[],
  accountId: string,
  monthKey: string,
  categories: Category[],
): CategorySpend[] {
  const map = spendingByCategory(txns, accountId, monthKey);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows: CategorySpend[] = [];
  for (const [id, cents] of Object.entries(map)) {
    const category = byId.get(id);
    if (!category || category.excludeFromTop || category.type === 'recurring') continue;
    rows.push({ category, cents });
  }
  rows.sort((a, b) => b.cents - a.cents);
  return rows;
}
