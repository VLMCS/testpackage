import type { FinancePlan, Transaction, Transfer, Wallet } from '@/types';
import { totalsForMonth, walletBalanceCents } from './selectors';
import { currentMonthKey, shiftMonthKey, monthLabel } from './date';

/**
 * Average monthly net savings (income − expense, transfers excluded) across the
 * last `months` COMPLETED months for an account. Uses completed months only so
 * the partial current month doesn't drag the estimate down. Returns 0 when
 * there's no history to average.
 */
export function avgMonthlySavingsCents(
  txns: Transaction[],
  accountId: string,
  months = 3,
): number {
  let sum = 0;
  for (let i = 1; i <= months; i++) {
    const key = shiftMonthKey(currentMonthKey(), -i);
    sum += totalsForMonth(txns, accountId, key).savedCents;
  }
  return Math.round(sum / months);
}

/** How much has been saved toward a plan right now (linked wallet or manual). */
export function planSavedCents(
  plan: FinancePlan,
  wallets: Wallet[],
  txns: Transaction[],
  transfers: Transfer[],
): number {
  if (plan.walletId) {
    const w = wallets.find((x) => x.id === plan.walletId);
    if (w) return walletBalanceCents(w, txns, transfers);
  }
  return plan.savedCents ?? 0;
}

export interface PlanForecast {
  savedCents: number;
  remainingCents: number;
  /** 0–1 progress ratio, clamped. */
  progress: number;
  reached: boolean;
  /** Months to reach the goal at the recent saving pace, or null if not projectable. */
  monthsToGoal: number | null;
  /** Human ETA like 'March 2027', or null when not projectable / already reached. */
  etaLabel: string | null;
  /** True when a deadline exists and the projected ETA lands after it. */
  behindDeadline: boolean;
}

/**
 * Project a plan's outlook from its current saved amount and the account's recent
 * monthly saving pace. Pure arithmetic — no AI. When the pace is ≤ 0 and the goal
 * isn't reached, there's no ETA (you're not currently saving toward it).
 */
export function forecastPlan(
  plan: FinancePlan,
  savedCents: number,
  avgMonthlySavingsCents: number,
): PlanForecast {
  const target = Math.max(0, plan.targetCents);
  const remainingCents = Math.max(0, target - savedCents);
  const progress = target === 0 ? 1 : Math.min(1, Math.max(0, savedCents / target));
  const reached = savedCents >= target && target > 0;

  let monthsToGoal: number | null = null;
  let etaLabel: string | null = null;
  if (!reached && remainingCents > 0 && avgMonthlySavingsCents > 0) {
    monthsToGoal = Math.ceil(remainingCents / avgMonthlySavingsCents);
    etaLabel = monthLabel(shiftMonthKey(currentMonthKey(), monthsToGoal));
  }

  let behindDeadline = false;
  if (plan.deadline && monthsToGoal !== null) {
    const etaKey = shiftMonthKey(currentMonthKey(), monthsToGoal);
    behindDeadline = etaKey > plan.deadline.slice(0, 7);
  } else if (plan.deadline && !reached && avgMonthlySavingsCents <= 0) {
    // No forward progress but a deadline exists → definitely behind.
    behindDeadline = true;
  }

  return {
    savedCents,
    remainingCents,
    progress,
    reached,
    monthsToGoal,
    etaLabel,
    behindDeadline,
  };
}
