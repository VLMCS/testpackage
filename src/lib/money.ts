// Money is stored everywhere as an integer number of minor units ("cents") to
// avoid floating-point drift. Display divides by 100 and formats with Intl.

export function formatCents(cents: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  } catch {
    // Unknown currency code — fall back to a plain number with the code prefix.
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/** Parse free-form user input (e.g. "1,234.50") into integer cents, or null if invalid. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
