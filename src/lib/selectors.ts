import type { Account, Transaction } from '@/types';
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
    if (monthKeyOf(t.date) !== monthKey) continue;
    if (t.type === 'income') income += t.amountCents;
    else expense += t.amountCents;
  }
  return { incomeCents: income, expenseCents: expense, savedCents: income - expense };
}

/** All-time running balance: opening balance + incomes − expenses. */
export function currentBalanceCents(account: Account, txns: Transaction[]): number {
  let balance = account.startingBalanceCents ?? 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
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
    if (monthKeyOf(t.date) !== monthKey) continue;
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amountCents;
  }
  return out;
}
