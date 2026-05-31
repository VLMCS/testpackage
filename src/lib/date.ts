import { format, parse, addMonths } from 'date-fns';

/** Today's local date as 'yyyy-MM-dd' (avoids UTC off-by-one). */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Month key 'yyyy-MM' from an ISO date string. */
export function monthKeyOf(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/** Current local month key, e.g. '2026-05'. */
export function currentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}

/** Shift a month key by N months (negative = past). */
export function shiftMonthKey(key: string, delta: number): string {
  const d = parse(key, 'yyyy-MM', new Date());
  return format(addMonths(d, delta), 'yyyy-MM');
}

/** Human label for a month key, e.g. 'May 2026'. */
export function monthLabel(key: string): string {
  return format(parse(key, 'yyyy-MM', new Date()), 'MMMM yyyy');
}

/** Short, friendly label for an ISO date, e.g. 'Sat, May 31'. */
export function friendlyDate(dateIso: string): string {
  return format(parse(dateIso, 'yyyy-MM-dd', new Date()), 'EEE, MMM d');
}
