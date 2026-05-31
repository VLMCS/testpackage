import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { useData } from '@/hooks/useData';
import { currentMonthKey, monthLabel } from '@/lib/date';
import { totalsForMonth, currentBalanceCents, spendingByCategory } from '@/lib/selectors';
import { formatCents } from '@/lib/money';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionList } from '@/components/transactions/TransactionList';
import { ArrowDownRight, ArrowUpRight, PiggyBank, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dashboard({ onViewAll }: { onViewAll: () => void }) {
  const { activeAccount, baseCurrency } = useSession();
  const { transactions, categories } = useData();
  const month = currentMonthKey();
  const accId = activeAccount?.id ?? '';

  const totals = useMemo(
    () => totalsForMonth(transactions, accId, month),
    [transactions, accId, month],
  );
  const balance = useMemo(
    () => (activeAccount ? currentBalanceCents(activeAccount, transactions) : 0),
    [activeAccount, transactions],
  );
  const top = useMemo(() => {
    const map = spendingByCategory(transactions, accId, month);
    let bestId: string | null = null;
    let best = 0;
    for (const [id, cents] of Object.entries(map)) {
      if (cents > best) {
        best = cents;
        bestId = id;
      }
    }
    const cat = categories.find((c) => c.id === bestId);
    return cat ? { name: cat.name, cents: best } : null;
  }, [transactions, categories, accId, month]);
  const recent = useMemo(
    () => transactions.filter((t) => t.accountId === accId).slice(0, 5),
    [transactions, accId],
  );

  if (!activeAccount) return null;

  return (
    <div className="space-y-5">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-5">
          <p className="text-xs opacity-80">{activeAccount.name}'s balance</p>
          <p className="text-3xl font-bold tracking-tight">{formatCents(balance, baseCurrency)}</p>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 px-1 text-sm font-medium text-muted-foreground">{monthLabel(month)}</p>
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
          categories={categories}
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
