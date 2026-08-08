import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { currentMonthKey, monthLabel, todayIso, friendlyDate } from '@/lib/date';
import {
  totalsForMonth,
  topSpendingCategories,
  walletBalanceCents,
  netWorthCents,
  spentOnDayCents,
} from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { getCategoryIcon } from '@/lib/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionList } from '@/components/transactions/TransactionList';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dashboard({
  onViewAll,
  onInsights,
  onOpenWallets,
}: {
  onViewAll: () => void;
  onInsights: () => void;
  onOpenWallets: () => void;
}) {
  const { activeAccount, baseCurrency } = useSession();
  const { transactions, categories, wallets, transfers } = useData();
  const month = currentMonthKey();
  const accId = activeAccount?.id ?? '';

  const myWallets = useMemo(
    () => wallets.filter((w) => w.accountId === accId && w.active),
    [wallets, accId],
  );

  const totals = useMemo(
    () => totalsForMonth(transactions, accId, month),
    [transactions, accId, month],
  );
  const netWorth = useMemo(
    () => (activeAccount ? netWorthCents(activeAccount, wallets, transactions, transfers) : 0),
    [activeAccount, wallets, transactions, transfers],
  );
  const spentToday = useMemo(
    () => spentOnDayCents(transactions, accId, todayIso()),
    [transactions, accId],
  );
  const myCats = useMemo(() => categories.filter((c) => c.accountId === accId), [categories, accId]);
  const top = useMemo(() => {
    const ranked = topSpendingCategories(transactions, accId, month, myCats);
    return ranked[0] ? { name: ranked[0].category.name, cents: ranked[0].cents } : null;
  }, [transactions, myCats, accId, month]);
  const recent = useMemo(
    () => transactions.filter((t) => t.accountId === accId).slice(0, 5),
    [transactions, accId],
  );

  if (!activeAccount) return null;

  return (
    <div className="space-y-5">
      <Card className="bg-accent-gradient border-0 text-primary-foreground">
        <CardContent className="py-5">
          <p className="text-xs opacity-80">{activeAccount.name}'s net worth</p>
          <p className="text-3xl font-bold tracking-tight">{formatCents(netWorth, baseCurrency)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Spent today</p>
              <p className="text-lg font-semibold tracking-tight">
                {formatCents(spentToday, baseCurrency)}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{friendlyDate(todayIso())}</span>
        </CardContent>
      </Card>

      {myWallets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-muted-foreground">Wallets</p>
            <Button variant="ghost" size="sm" onClick={onOpenWallets}>
              Manage <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {myWallets.map((w) => {
              const Icon = getCategoryIcon(w.icon);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={onOpenWallets}
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: w.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-muted-foreground">{w.name}</span>
                    <span className="block truncate text-sm font-semibold tabular-nums">
                      {formatCents(walletBalanceCents(w, transactions, transfers), baseCurrency)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{monthLabel(month)}</p>
            <Button variant="ghost" size="sm" className="-mr-2 h-auto py-0" onClick={onInsights}>
              Insights <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MonthStat
              label="Income"
              value={formatCents(totals.incomeCents, baseCurrency)}
              tone="emerald"
            />
            <MonthStat
              label="Spending"
              value={formatCents(totals.expenseCents, baseCurrency)}
              tone="rose"
            />
            <MonthStat
              label="Saved"
              value={formatCents(totals.savedCents, baseCurrency)}
              tone={totals.savedCents >= 0 ? 'emerald' : 'rose'}
            />
          </div>
          {top && (
            <p className="border-t pt-2 text-xs text-muted-foreground">
              Top category: <span className="font-medium text-foreground">{top.name}</span> ·{' '}
              {formatCents(top.cents, baseCurrency)}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">Recent</p>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
          </Button>
        </div>
        <TransactionList
          transactions={recent}
          categories={myCats}
          currency={baseCurrency}
          emptyLabel="No transactions yet — tap + to add one."
        />
      </div>
    </div>
  );
}

function MonthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('truncate text-base font-semibold tracking-tight', toneClass)}>{value}</p>
    </div>
  );
}
