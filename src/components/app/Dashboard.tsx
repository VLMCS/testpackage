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
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, PiggyBank, Trophy } from 'lucide-react';
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
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {myWallets.map((w) => {
              const Icon = getCategoryIcon(w.icon);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={onOpenWallets}
                  className="flex shrink-0 items-center gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: w.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{w.name}</span>
                    <span className="block text-sm font-semibold tabular-nums">
                      {formatCents(walletBalanceCents(w, transactions, transfers), baseCurrency)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-muted-foreground">{monthLabel(month)}</p>
          <Button variant="ghost" size="sm" onClick={onInsights}>
            Insights <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Income"
            value={formatCents(totals.incomeCents, baseCurrency)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            tone="emerald"
          />
          <StatCard
            label="Spending"
            value={formatCents(totals.expenseCents, baseCurrency)}
            icon={<ArrowDownRight className="h-4 w-4" />}
            tone="rose"
          />
          <StatCard
            label="Saved"
            value={formatCents(totals.savedCents, baseCurrency)}
            icon={<PiggyBank className="h-4 w-4" />}
            tone={totals.savedCents >= 0 ? 'emerald' : 'rose'}
          />
          <StatCard
            label="Top category"
            value={top ? top.name : '—'}
            sub={top ? formatCents(top.cents, baseCurrency) : undefined}
            icon={<Trophy className="h-4 w-4" />}
            tone="amber"
          />
        </div>
      </div>

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

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'amber';
}) {
  const toneClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  }[tone];

  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', toneClasses)}>
          {icon}
        </span>
        <p className="pt-1 text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tracking-tight">{value}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
