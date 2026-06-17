import { useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  totalsForMonth,
  topSpendingCategories,
  balanceAtMonthStart,
  balanceAtMonthEnd,
} from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { currentMonthKey, shiftMonthKey, monthLabel, isMonthComplete } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Minus,
} from 'lucide-react';

export function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const { activeAccount, baseCurrency } = useSession();
  const { transactions, categories } = useData();
  const [month, setMonth] = useState(currentMonthKey());

  const accId = activeAccount?.id ?? '';
  const prevMonth = shiftMonthKey(month, -1);

  const cur = useMemo(() => totalsForMonth(transactions, accId, month), [transactions, accId, month]);
  const prev = useMemo(
    () => totalsForMonth(transactions, accId, prevMonth),
    [transactions, accId, prevMonth],
  );
  const myCats = useMemo(() => categories.filter((c) => c.accountId === accId), [categories, accId]);
  const topCats = useMemo(
    () => topSpendingCategories(transactions, accId, month, myCats),
    [transactions, accId, month, myCats],
  );
  const startBalance = useMemo(
    () => (activeAccount ? balanceAtMonthStart(activeAccount, transactions, month) : 0),
    [activeAccount, transactions, month],
  );
  const endBalance = useMemo(
    () => (activeAccount ? balanceAtMonthEnd(activeAccount, transactions, month) : 0),
    [activeAccount, transactions, month],
  );

  if (!activeAccount) return null;

  const maxCat = topCats[0]?.cents ?? 0;
  const savingsRate = cur.incomeCents > 0 ? Math.round((cur.savedCents / cur.incomeCents) * 100) : null;
  const hasExcluded = myCats.some((c) => c.excludeFromTop);
  const monthOver = isMonthComplete(month);
  const netChange = endBalance - startBalance;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card px-2 py-1.5">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonthKey(m, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">Balance over {monthLabel(month)}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">First day</p>
              <p className="truncate text-lg font-semibold tabular-nums">
                {formatCents(startBalance, baseCurrency)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-right">
              <p className="text-xs text-muted-foreground">Last day</p>
              {monthOver ? (
                <p className="truncate text-lg font-semibold tabular-nums">
                  {formatCents(endBalance, baseCurrency)}
                </p>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              )}
            </div>
          </div>
          {monthOver ? (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Net change</span>
              <span
                className={cn(
                  'flex items-center gap-0.5 text-sm font-medium tabular-nums',
                  netChange === 0
                    ? 'text-muted-foreground'
                    : netChange > 0
                      ? 'text-emerald-600'
                      : 'text-rose-600',
                )}
              >
                {netChange === 0 ? (
                  <Minus className="h-3.5 w-3.5" />
                ) : netChange > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {netChange > 0 ? '+' : netChange < 0 ? '−' : ''}
                {formatCents(Math.abs(netChange), baseCurrency)}
              </span>
            </div>
          ) : (
            <p className="border-t pt-2 text-xs text-muted-foreground">
              Your last-day balance appears here once {monthLabel(month)} is over.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Tile label="Income" value={formatCents(cur.incomeCents, baseCurrency)} />
        <Tile label="Spent" value={formatCents(cur.expenseCents, baseCurrency)} />
        <Tile
          label="Saved"
          value={formatCents(cur.savedCents, baseCurrency)}
          accent={cur.savedCents >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {savingsRate !== null && (
        <p className="px-1 text-sm text-muted-foreground">
          You saved <span className="font-semibold text-foreground">{savingsRate}%</span> of your
          income this month.
        </p>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">vs {monthLabel(prevMonth)}</p>
          <CompareRow label="Spent" cur={cur.expenseCents} prev={prev.expenseCents} goodWhenUp={false} currency={baseCurrency} />
          <CompareRow label="Saved" cur={cur.savedCents} prev={prev.savedCents} goodWhenUp currency={baseCurrency} />
          <CompareRow label="Income" cur={cur.incomeCents} prev={prev.incomeCents} goodWhenUp currency={baseCurrency} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">Where you spend the most</p>
          {topCats.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No spending to rank this month.</p>
          ) : (
            <div className="space-y-3">
              {topCats.slice(0, 6).map(({ category, cents }) => (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </span>
                    <span className="font-medium tabular-nums">{formatCents(cents, baseCurrency)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${maxCat > 0 ? (cents / maxCat) * 100 : 0}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasExcluded && (
            <p className="text-xs text-muted-foreground">
              Some categories are excluded from this ranking (see Categories). They still count in
              your total Spent.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'rose';
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'truncate text-base font-semibold tracking-tight',
            accent === 'emerald' && 'text-emerald-600',
            accent === 'rose' && 'text-rose-600',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function CompareRow({
  label,
  cur,
  prev,
  goodWhenUp,
  currency,
}: {
  label: string;
  cur: number;
  prev: number;
  goodWhenUp: boolean;
  currency: string;
}) {
  const delta = cur - prev;
  const flat = delta === 0;
  const up = delta > 0;
  const good = flat ? null : up === goodWhenUp;
  const pct = prev !== 0 ? Math.round((Math.abs(delta) / Math.abs(prev)) * 100) : null;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium tabular-nums">{formatCents(cur, currency)}</span>
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs tabular-nums',
            flat ? 'text-muted-foreground' : good ? 'text-emerald-600' : 'text-rose-600',
          )}
        >
          {flat ? (
            <Minus className="h-3 w-3" />
          ) : up ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {flat ? '—' : `${formatCents(Math.abs(delta), currency)}${pct !== null ? ` (${pct}%)` : ''}`}
        </span>
      </div>
    </div>
  );
}
