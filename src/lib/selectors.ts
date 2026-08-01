import type { Account, Category, Transaction, Wallet } from '@/types';
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
 * Running balance of a single wallet: its opening balance plus every transaction
 * assigned to it (income adds, expense subtracts). Like account balances, this
 * counts notTracked transfers — the money really moved in or out of the wallet.
 * Transactions with no walletId are ignored (they belong to no wallet).
 */
export function walletBalanceCents(wallet: Wallet, txns: Transaction[]): number {
  let balance = wallet.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.walletId !== wallet.id) continue;
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  return balance;
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
