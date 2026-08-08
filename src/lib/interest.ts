import type { InterestTier, WalletInterest } from '@/types';

/** How many crediting periods of each frequency fall in a year. */
export const PERIODS_PER_YEAR: Record<WalletInterest['frequency'], number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
};

export const FREQUENCY_LABEL: Record<WalletInterest['frequency'], string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

/**
 * Gross annual interest (in cents) a balance earns under a tiered rate. Each tier
 * applies its rate only to the portion of the balance within its band. Tiers are
 * read in ascending order of `upToCents`, with a null ceiling meaning "and above".
 */
export function grossAnnualInterestCents(balanceCents: number, tiers: InterestTier[]): number {
  if (balanceCents <= 0 || tiers.length === 0) return 0;
  // Sort ascending; a null ceiling sorts last (treated as +infinity).
  const sorted = [...tiers].sort((a, b) => {
    if (a.upToCents === null) return 1;
    if (b.upToCents === null) return -1;
    return a.upToCents - b.upToCents;
  });

  let prevCeiling = 0;
  let gross = 0;
  for (const tier of sorted) {
    const ceiling = tier.upToCents === null ? Infinity : tier.upToCents;
    const portion = Math.max(0, Math.min(balanceCents, ceiling) - prevCeiling);
    if (portion > 0) gross += portion * (tier.ratePercent / 100);
    prevCeiling = ceiling;
    if (balanceCents <= ceiling) break;
  }
  return gross;
}

export interface InterestProjection {
  grossAnnualCents: number;
  netAnnualCents: number; // after withholding tax
  /** Net interest for one crediting period at the configured frequency. */
  perPeriodCents: number;
  /** Blended net rate as a % of the balance (for display). */
  effectiveNetRatePercent: number;
}

/**
 * Project what a wallet earns from its current balance: gross and net annual,
 * and the net amount per crediting period. Pure arithmetic — no side effects,
 * nothing posted. Returns zeros when the balance is non-positive.
 */
export function projectInterest(
  balanceCents: number,
  interest: WalletInterest,
): InterestProjection {
  const grossAnnualCents = grossAnnualInterestCents(balanceCents, interest.tiers);
  const taxFactor = 1 - Math.min(100, Math.max(0, interest.withholdingTaxPercent)) / 100;
  const netAnnualCents = grossAnnualCents * taxFactor;
  const perPeriodCents = netAnnualCents / PERIODS_PER_YEAR[interest.frequency];
  const effectiveNetRatePercent =
    balanceCents > 0 ? (netAnnualCents / balanceCents) * 100 : 0;
  return {
    grossAnnualCents: Math.round(grossAnnualCents),
    netAnnualCents: Math.round(netAnnualCents),
    perPeriodCents: Math.round(perPeriodCents),
    effectiveNetRatePercent,
  };
}
